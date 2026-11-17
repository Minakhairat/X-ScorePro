import { type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  calculateDiscountFromExcess,
  DEFAULT_DEPARTMENTS,
  SUPER_ADMIN_EMAIL,
  type AdminAssignmentDirectoryItem,
  type AdminRecord,
  type AdminSession,
  type DepartmentItem,
  type DirectoryEmployeeItem,
  type Employee,
  type ExcelEmployeeImportRow,
  type FullAppBackupPayload,
  type MonthlyArchiveRecord,
  type StatsSummary,
  type XScoreAuditLog,
  type XScoreLogEntry
} from '../types/xscore';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return cleaned || 'item';
}

export function makeEmployeeDocId(code: string, serial: number): string {
  const trimmed = code.trim();
  if (trimmed.length > 0) {
    return `emp_${sanitizeId(trimmed)}`;
  }
  return `emp_row_${serial}`;
}

export function computeSummaryFromItems(
  items: Pick<DirectoryEmployeeItem, 'excessCount' | 'discountPercentage'>[]
): Pick<StatsSummary, 'totalEmployees' | 'avgDiscount' | 'totalExcess' | 'employeesWithExcess'> {
  const totalEmployees = items.length;
  let totalDiscount = 0;
  let discountCount = 0;
  let totalExcess = 0;
  let employeesWithExcess = 0;

  for (const item of items) {
    const excess = Number(item.excessCount) || 0;
    const disc = Number(item.discountPercentage) || 0;
    totalExcess += excess;
    if (excess > 0) employeesWithExcess += 1;
    if (disc > 0) {
      totalDiscount += disc;
      discountCount += 1;
    }
  }

  const avgDiscount = discountCount > 0 ? Math.round(totalDiscount / discountCount) : 0;
  return {
    totalEmployees,
    avgDiscount,
    totalExcess,
    employeesWithExcess
  };
}

// ========== Public Worker Read Functions ==========

export async function fetchStatsSummary(): Promise<StatsSummary | null> {
  const path = 'stats/summary';
  try {
    const snap = await getDoc(doc(db, 'stats', 'summary'));
    if (!snap.exists()) return null;
    return snap.data() as StatsSummary;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function lookupEmployeeByCode(codeInput: string): Promise<{
  employee: Employee | null;
  source: 'firestore';
}> {
  const code = codeInput.trim();
  if (!code) return { employee: null, source: 'firestore' };

  const docId = makeEmployeeDocId(code, 0);
  const path = `employees/${docId}`;
  try {
    const snap = await getDoc(doc(db, 'employees', docId));
    if (snap.exists()) {
      return {
        employee: { id: snap.id, ...(snap.data() as Omit<Employee, 'id'>) },
        source: 'firestore'
      };
    }
    return { employee: null, source: 'firestore' };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function getEmptySummary(): StatsSummary {
  return {
    totalEmployees: 0,
    avgDiscount: 0,
    totalExcess: 0,
    employeesWithExcess: 0,
    seedInitialized: false,
    cycleLabel: 'بانتظار رفع ملف الإكسيل أو تسجيل الموظفين يدوياً'
  };
}

// ========== Departments / Production Lines (Super Admin Managed) ==========

export function getDefaultDepartmentItems(): DepartmentItem[] {
  return DEFAULT_DEPARTMENTS.map((name, idx) => ({
    id: `dept_${idx + 1}`,
    name
  }));
}

export async function fetchDepartments(): Promise<DepartmentItem[]> {
  const path = 'directory/departments';
  try {
    const snap = await getDoc(doc(db, 'directory', 'departments'));
    if (!snap.exists()) {
      return getDefaultDepartmentItems();
    }
    const rawItems = (snap.data().items || []) as DepartmentItem[];
    if (rawItems.length === 0) return getDefaultDepartmentItems();
    return rawItems;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveDepartments(items: DepartmentItem[]): Promise<DepartmentItem[]> {
  const path = 'directory/departments';
  const seen = new Set<string>();
  const cleaned: DepartmentItem[] = [];

  for (const item of items) {
    const name = item.name.trim().slice(0, 80);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    cleaned.push({
      id: sanitizeId(item.id || `dept_${cleaned.length + 1}`),
      name
    });
  }

  const finalItems = cleaned.length > 0 ? cleaned.slice(0, 200) : getDefaultDepartmentItems();

  try {
    await setDoc(doc(db, 'directory', 'departments'), {
      items: finalItems,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  return finalItems;
}

// ========== Admin Session & Auth Resolution ==========

export async function resolveAdminSession(user: User | null): Promise<AdminSession> {
  if (!user || !user.email || !user.emailVerified) {
    return {
      role: 'none',
      adminKey: null,
      displayName: user?.displayName || '',
      email: user?.email || '',
      canAssignEmployees: false,
      active: false,
      assignedEmployeeIds: []
    };
  }

  const email = user.email.toLowerCase();

  if (email === SUPER_ADMIN_EMAIL) {
    return {
      role: 'super_admin',
      adminKey: 'super_admin',
      displayName: user.displayName || 'الأدمن الرئيسي',
      email,
      canAssignEmployees: true,
      active: true,
      assignedEmployeeIds: []
    };
  }

  // Sub-admin lookup by verified email (query matches allow list rule: existing().email == request.auth.token.email)
  const adminsPath = 'admins';
  let adminDocId: string | null = null;
  let adminData: Omit<AdminRecord, 'id'> | null = null;
  try {
    const q = query(collection(db, 'admins'), where('email', '==', email), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      adminDocId = snap.docs[0].id;
      adminData = snap.docs[0].data() as Omit<AdminRecord, 'id'>;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, adminsPath);
  }

  if (!adminDocId || !adminData || !adminData.active) {
    return {
      role: 'none',
      adminKey: null,
      displayName: user.displayName || email,
      email,
      canAssignEmployees: false,
      active: false,
      assignedEmployeeIds: []
    };
  }

  // Ensure user_admin_links/{uid} is bound to this adminKey for Firestore rules verification
  const linkPath = `user_admin_links/${user.uid}`;
  try {
    const linkRef = doc(db, 'user_admin_links', user.uid);
    const linkSnap = await getDoc(linkRef);
    if (!linkSnap.exists()) {
      await setDoc(linkRef, {
        uid: user.uid,
        adminKey: adminDocId,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else if (linkSnap.data()?.adminKey !== adminDocId) {
      await updateDoc(linkRef, {
        adminKey: adminDocId,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, linkPath);
  }

  // Assistant admins have access to all employees automatically without individual assignments
  let assignedEmployeeIds: string[] = [];
  if (adminData.role === 'supervisor') {
    const dirPath = 'directory/admin_assignments';
    try {
      const dirSnap = await getDoc(doc(db, 'directory', 'admin_assignments'));
      if (dirSnap.exists()) {
        const items = (dirSnap.data().items || []) as AdminAssignmentDirectoryItem[];
        const myEntry = items.find((item) => item.id === adminDocId);
        if (myEntry) {
          assignedEmployeeIds = myEntry.assignedEmployeeIds || [];
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, dirPath);
    }
  }

  return {
    role: adminData.role,
    adminKey: adminDocId,
    displayName: adminData.displayName || user.displayName || email,
    email,
    canAssignEmployees: adminData.role === 'supervisor' ? false : adminData.canAssignEmployees,
    active: adminData.active,
    assignedEmployeeIds
  };
}

// ========== Fetching Employees for Admin Views ==========

export async function fetchAllEmployeesForSuperAdmin(): Promise<Employee[]> {
  const path = 'employees';
  try {
    const q = query(collection(db, 'employees'), orderBy('serial', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Employee, 'id'>)
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchDirectoryEmployeesIndex(): Promise<DirectoryEmployeeItem[]> {
  const path = 'directory/employees_index';
  try {
    const snap = await getDoc(doc(db, 'directory', 'employees_index'));
    if (!snap.exists()) return [];
    const items = (snap.data().items || []) as DirectoryEmployeeItem[];
    return [...items].sort((a, b) => a.serial - b.serial);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchAssignedEmployeesByIds(employeeIds: string[]): Promise<Employee[]> {
  if (employeeIds.length === 0) return [];
  const results: Employee[] = [];
  const promises = employeeIds.map(async (empId) => {
    const path = `employees/${empId}`;
    try {
      const snap = await getDoc(doc(db, 'employees', empId));
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as Omit<Employee, 'id'>) } as Employee;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  });
  const settled = await Promise.all(promises);
  for (const item of settled) {
    if (item) results.push(item);
  }
  return results.sort((a, b) => a.serial - b.serial);
}

// ========== Direct X-Score Recording ==========

export async function recordEmployeeXScore(params: {
  employee: Employee;
  delta: number;
  customDiscountPercentage?: number;
  reason: string;
  category: string;
  session: AdminSession;
  uid: string;
}): Promise<{ updatedEmployee: Employee; newSummary: StatsSummary }> {
  const { employee, delta, customDiscountPercentage, reason, category, session, uid } = params;
  const previousExcess = Number(employee.excessCount) || 0;
  const newExcess = Math.max(0, Math.min(100000, previousExcess + delta));
  const previousDiscount = Number(employee.discountPercentage) || 0;
  const newDiscount =
    typeof customDiscountPercentage === 'number'
      ? Math.max(0, Math.min(100, Math.round(customDiscountPercentage)))
      : calculateDiscountFromExcess(newExcess);

  const now = new Date();
  const dateLabel = now.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });

  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: XScoreLogEntry = {
    id: logId,
    delta,
    reason: reason.trim().slice(0, 200),
    category: category.trim().slice(0, 60),
    dateLabel: dateLabel.slice(0, 40),
    recordedByName: session.displayName.slice(0, 80),
    createdAtIso: now.toISOString()
  };

  const updatedLogs = [entry, ...(employee.recentLogs || [])].slice(0, 50);

  const dirItems = await fetchDirectoryEmployeesIndex();
  const updatedItems = dirItems.map((item) =>
    item.id === employee.id
      ? { ...item, excessCount: newExcess, discountPercentage: newDiscount }
      : item
  );
  const stats = computeSummaryFromItems(updatedItems);

  const batch = writeBatch(db);

  batch.update(doc(db, 'employees', employee.id), {
    excessCount: newExcess,
    discountPercentage: newDiscount,
    recentLogs: updatedLogs,
    updatedAt: serverTimestamp()
  });

  batch.set(doc(db, 'xscore_logs', logId), {
    employeeId: employee.id,
    employeeCode: employee.code.slice(0, 32),
    employeeName: employee.name.slice(0, 120),
    delta,
    previousExcess,
    newExcess,
    previousDiscount,
    newDiscount,
    reason: entry.reason,
    category: entry.category,
    dateLabel: entry.dateLabel,
    recordedByUid: uid,
    recordedByName: session.displayName.slice(0, 80),
    recordedByRole: session.role,
    createdAt: serverTimestamp()
  });

  if (dirItems.length > 0) {
    batch.update(doc(db, 'directory', 'employees_index'), {
      items: updatedItems,
      updatedAt: serverTimestamp()
    });
  }

  batch.update(doc(db, 'stats', 'summary'), {
    avgDiscount: stats.avgDiscount,
    totalExcess: stats.totalExcess,
    employeesWithExcess: stats.employeesWithExcess,
    updatedAt: serverTimestamp()
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `employees/${employee.id}`);
  }

  const currentSummary = await fetchStatsSummary();

  return {
    updatedEmployee: {
      ...employee,
      excessCount: newExcess,
      discountPercentage: newDiscount,
      recentLogs: updatedLogs
    },
    newSummary: currentSummary || {
      ...stats,
      seedInitialized: true,
      cycleLabel: 'الدورة الحالية'
    }
  };
}

// ========== Employee CRUD & Department Selection ==========

export async function updateEmployeeDepartment(
  employeeId: string,
  department: string
): Promise<string> {
  const trimmedDept = (department.trim() || 'عام').slice(0, 80);
  const path = `employees/${employeeId}`;

  const [dirItems, dirSnap] = await Promise.all([
    fetchDirectoryEmployeesIndex(),
    getDoc(doc(db, 'directory', 'employees_index'))
  ]);

  const updatedItems = dirItems.map((item) =>
    item.id === employeeId ? { ...item, department: trimmedDept } : item
  );

  const batch = writeBatch(db);
  batch.update(doc(db, 'employees', employeeId), {
    department: trimmedDept,
    updatedAt: serverTimestamp()
  });

  if (dirSnap.exists()) {
    batch.update(doc(db, 'directory', 'employees_index'), {
      items: updatedItems,
      updatedAt: serverTimestamp()
    });
  } else {
    batch.set(doc(db, 'directory', 'employees_index'), {
      items: updatedItems,
      updatedAt: serverTimestamp()
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  return trimmedDept;
}

export async function createOrUpdateEmployee(params: {
  existingEmployee?: Employee;
  code: string;
  name: string;
  department: string;
  serial?: number;
  isSuperAdmin?: boolean;
}): Promise<Employee> {
  const { existingEmployee, code, name, department, serial, isSuperAdmin = false } = params;
  const trimmedCode = code.trim().slice(0, 32);
  const trimmedName = name.trim().slice(0, 120);
  const trimmedDept = (department.trim() || 'عام').slice(0, 80);

  const dirItems = await fetchDirectoryEmployeesIndex();

  if (existingEmployee) {
    const path = `employees/${existingEmployee.id}`;
    const updatedItems = dirItems.map((item) =>
      item.id === existingEmployee.id
        ? {
            ...item,
            code: isSuperAdmin ? trimmedCode : item.code,
            name: trimmedName,
            department: trimmedDept
          }
        : item
    );
    const batch = writeBatch(db);
    if (isSuperAdmin) {
      batch.update(doc(db, 'employees', existingEmployee.id), {
        code: trimmedCode,
        name: trimmedName,
        department: trimmedDept,
        updatedAt: serverTimestamp()
      });
    } else {
      batch.update(doc(db, 'employees', existingEmployee.id), {
        name: trimmedName,
        department: trimmedDept,
        updatedAt: serverTimestamp()
      });
    }
    batch.update(doc(db, 'directory', 'employees_index'), {
      items: updatedItems,
      updatedAt: serverTimestamp()
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return {
      ...existingEmployee,
      code: isSuperAdmin ? trimmedCode : existingEmployee.code,
      name: trimmedName,
      department: trimmedDept
    };
  }

  const nextSerial =
    serial || dirItems.reduce((max, item) => Math.max(max, item.serial), 0) + 1;
  const newId = makeEmployeeDocId(trimmedCode, nextSerial);
  const path = `employees/${newId}`;

  try {
    const existingSnap = await getDoc(doc(db, 'employees', newId));
    if (existingSnap.exists()) {
      throw new Error('DUPLICATE_CODE');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_CODE') {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }

  const newEmployee: Employee = {
    id: newId,
    serial: nextSerial,
    code: trimmedCode,
    name: trimmedName,
    department: trimmedDept,
    excessCount: 0,
    discountPercentage: 0,
    recentLogs: [],
    assignedAdminKeys: []
  };

  const newDirItem: DirectoryEmployeeItem = {
    id: newId,
    serial: nextSerial,
    code: trimmedCode,
    name: trimmedName,
    department: trimmedDept,
    excessCount: 0,
    discountPercentage: 0
  };

  const updatedItems = [...dirItems, newDirItem];
  const stats = computeSummaryFromItems(updatedItems);

  const [dirSnap, statsSnap] = await Promise.all([
    getDoc(doc(db, 'directory', 'employees_index')),
    getDoc(doc(db, 'stats', 'summary'))
  ]);

  const batch = writeBatch(db);
  batch.set(doc(db, 'employees', newId), {
    serial: nextSerial,
    code: trimmedCode,
    name: trimmedName,
    department: trimmedDept,
    excessCount: 0,
    discountPercentage: 0,
    recentLogs: [],
    assignedAdminKeys: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  if (dirSnap.exists()) {
    batch.update(doc(db, 'directory', 'employees_index'), {
      items: updatedItems,
      updatedAt: serverTimestamp()
    });
  } else {
    batch.set(doc(db, 'directory', 'employees_index'), {
      items: updatedItems,
      updatedAt: serverTimestamp()
    });
  }

  if (statsSnap.exists()) {
    batch.update(doc(db, 'stats', 'summary'), {
      totalEmployees: stats.totalEmployees,
      avgDiscount: stats.avgDiscount,
      totalExcess: stats.totalExcess,
      employeesWithExcess: stats.employeesWithExcess,
      seedInitialized: true,
      updatedAt: serverTimestamp()
    });
  } else {
    batch.set(doc(db, 'stats', 'summary'), {
      totalEmployees: stats.totalEmployees,
      avgDiscount: stats.avgDiscount,
      totalExcess: stats.totalExcess,
      employeesWithExcess: stats.employeesWithExcess,
      seedInitialized: true,
      cycleLabel: 'الدورة الحالية',
      updatedAt: serverTimestamp()
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return newEmployee;
}

export async function importEmployeesFromExcelRows(params: {
  rows: ExcelEmployeeImportRow[];
  mode: 'merge' | 'add_new_only';
  cycleLabel?: string;
}): Promise<{ createdCount: number; updatedCount: number; skippedCount: number; summary: StatsSummary }> {
  const { rows, mode, cycleLabel = 'الدورة الحالية' } = params;

  const [existingDirItems, dirSnap, statsSnap, assignSnap] = await Promise.all([
    fetchDirectoryEmployeesIndex(),
    getDoc(doc(db, 'directory', 'employees_index')),
    getDoc(doc(db, 'stats', 'summary')),
    getDoc(doc(db, 'directory', 'admin_assignments'))
  ]);

  const itemMap = new Map<string, DirectoryEmployeeItem>();
  let maxSerial = 0;
  for (const item of existingDirItems) {
    itemMap.set(item.id, item);
    if (item.serial > maxSerial) maxSerial = item.serial;
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Deduplicate incoming rows by target empId so each doc is written once per import
  const pendingWrites = new Map<
    string,
    {
      isUpdate: boolean;
      serial: number;
      code: string;
      name: string;
      department: string;
      excessCount: number;
      discountPercentage: number;
    }
  >();

  for (const row of rows) {
    const cleanName = row.name.trim().slice(0, 120);
    if (!cleanName) {
      skippedCount += 1;
      continue;
    }

    const cleanCode = row.code.trim().slice(0, 32);
    const cleanDept = (row.department.trim() || 'عام').slice(0, 80);
    const cleanExcess = Math.max(0, Math.min(100000, Math.round(Number(row.excessCount) || 0)));
    const cleanDiscount = Math.max(
      0,
      Math.min(100, Math.round(Number(row.discountPercentage) ?? calculateDiscountFromExcess(cleanExcess)))
    );

    const candidateSerial =
      row.serial && row.serial > 0 ? Math.round(row.serial) : maxSerial + 1;
    const empId = makeEmployeeDocId(cleanCode, candidateSerial);
    const existing = itemMap.get(empId);

    if (existing && mode === 'add_new_only') {
      skippedCount += 1;
      continue;
    }

    let assignedSerial = existing ? existing.serial : candidateSerial;
    if (!existing) {
      if (!row.serial || row.serial <= 0) {
        maxSerial += 1;
        assignedSerial = maxSerial;
      } else if (row.serial > maxSerial) {
        maxSerial = row.serial;
      }
    }

    itemMap.set(empId, {
      id: empId,
      serial: assignedSerial,
      code: existing ? existing.code : cleanCode,
      name: cleanName,
      department: cleanDept,
      excessCount: cleanExcess,
      discountPercentage: cleanDiscount
    });

    pendingWrites.set(empId, {
      isUpdate: Boolean(existing),
      serial: assignedSerial,
      code: existing ? existing.code : cleanCode,
      name: cleanName,
      department: cleanDept,
      excessCount: cleanExcess,
      discountPercentage: cleanDiscount
    });
  }

  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  for (const [empId, entry] of pendingWrites.entries()) {
    if (entry.isUpdate) {
      updatedCount += 1;
      operations.push((batch) =>
        batch.update(doc(db, 'employees', empId), {
          name: entry.name,
          department: entry.department,
          excessCount: entry.excessCount,
          discountPercentage: entry.discountPercentage,
          updatedAt: serverTimestamp()
        })
      );
    } else {
      createdCount += 1;
      operations.push((batch) =>
        batch.set(doc(db, 'employees', empId), {
          serial: entry.serial,
          code: entry.code,
          name: entry.name,
          department: entry.department,
          excessCount: entry.excessCount,
          discountPercentage: entry.discountPercentage,
          recentLogs: [],
          assignedAdminKeys: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );
    }
  }

  const finalItems = Array.from(itemMap.values())
    .sort((a, b) => a.serial - b.serial)
    .slice(0, 2000);

  const computed = computeSummaryFromItems(finalItems);
  const nextCycleLabel =
    (statsSnap.exists() ? (statsSnap.data() as StatsSummary).cycleLabel : cycleLabel).slice(0, 60) ||
    'الدورة الحالية';

  operations.push((batch) => {
    if (dirSnap.exists()) {
      batch.update(doc(db, 'directory', 'employees_index'), {
        items: finalItems,
        updatedAt: serverTimestamp()
      });
    } else {
      batch.set(doc(db, 'directory', 'employees_index'), {
        items: finalItems,
        updatedAt: serverTimestamp()
      });
    }
  });

  if (!assignSnap.exists()) {
    operations.push((batch) =>
      batch.set(doc(db, 'directory', 'admin_assignments'), {
        items: [],
        updatedAt: serverTimestamp()
      })
    );
  }

  operations.push((batch) => {
    if (statsSnap.exists()) {
      batch.update(doc(db, 'stats', 'summary'), {
        totalEmployees: computed.totalEmployees,
        avgDiscount: computed.avgDiscount,
        totalExcess: computed.totalExcess,
        employeesWithExcess: computed.employeesWithExcess,
        seedInitialized: true,
        updatedAt: serverTimestamp()
      });
    } else {
      batch.set(doc(db, 'stats', 'summary'), {
        ...computed,
        seedInitialized: true,
        cycleLabel: nextCycleLabel,
        updatedAt: serverTimestamp()
      });
    }
  });

  const chunkSize = 350;
  try {
    for (let i = 0; i < operations.length; i += chunkSize) {
      const batch = writeBatch(db);
      const slice = operations.slice(i, i + chunkSize);
      for (const op of slice) {
        op(batch);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'employees');
  }

  return {
    createdCount,
    updatedCount,
    skippedCount,
    summary: {
      ...computed,
      seedInitialized: true,
      cycleLabel: nextCycleLabel
    }
  };
}

export async function deleteEmployeeRecord(employeeId: string): Promise<void> {
  const path = `employees/${employeeId}`;
  const dirItems = await fetchDirectoryEmployeesIndex();
  const updatedItems = dirItems.filter((item) => item.id !== employeeId);
  const stats = computeSummaryFromItems(updatedItems);

  const batch = writeBatch(db);
  batch.delete(doc(db, 'employees', employeeId));
  batch.update(doc(db, 'directory', 'employees_index'), {
    items: updatedItems,
    updatedAt: serverTimestamp()
  });
  batch.update(doc(db, 'stats', 'summary'), {
    totalEmployees: stats.totalEmployees,
    avgDiscount: stats.avgDiscount,
    totalExcess: stats.totalExcess,
    employeesWithExcess: stats.employeesWithExcess,
    updatedAt: serverTimestamp()
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ========== Admin & Sub-Admin Management ==========

export async function fetchAllAdminsForSuperAdmin(): Promise<AdminRecord[]> {
  const path = 'admins';
  try {
    const snap = await getDocs(collection(db, 'admins'));
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AdminRecord, 'id'>)
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAdminAssignmentsDirectory(): Promise<AdminAssignmentDirectoryItem[]> {
  const path = 'directory/admin_assignments';
  try {
    const snap = await getDoc(doc(db, 'directory', 'admin_assignments'));
    if (!snap.exists()) return [];
    return (snap.data().items || []) as AdminAssignmentDirectoryItem[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function addSubAdmin(params: {
  email: string;
  displayName: string;
  role: 'assistant_admin' | 'supervisor';
  canAssignEmployees: boolean;
  createdByEmail: string;
}): Promise<AdminRecord> {
  const email = params.email.trim().toLowerCase().slice(0, 120);
  const displayName = params.displayName.trim().slice(0, 80);
  const adminKey = `adm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `admins/${adminKey}`;

  const existingAssignments = await fetchAdminAssignmentsDirectory();
  const newDirItem: AdminAssignmentDirectoryItem = {
    id: adminKey,
    displayName,
    role: params.role,
    canAssignEmployees: params.canAssignEmployees,
    active: true,
    assignedEmployeeIds: []
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'admins', adminKey), {
    email,
    displayName,
    role: params.role,
    canAssignEmployees: params.canAssignEmployees,
    active: true,
    assignedCount: 0,
    createdByEmail: params.createdByEmail.toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  batch.set(doc(db, 'directory', 'admin_assignments'), {
    items: [...existingAssignments, newDirItem],
    updatedAt: serverTimestamp()
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    id: adminKey,
    email,
    displayName,
    role: params.role,
    canAssignEmployees: params.canAssignEmployees,
    active: true,
    assignedCount: 0,
    createdByEmail: params.createdByEmail.toLowerCase()
  };
}

export async function updateSubAdminSettings(
  admin: AdminRecord,
  updates: Partial<
    Pick<AdminRecord, 'email' | 'displayName' | 'role' | 'canAssignEmployees' | 'active'>
  >
): Promise<void> {
  const path = `admins/${admin.id}`;
  const existingAssignments = await fetchAdminAssignmentsDirectory();
  const nextEmail = (updates.email ?? admin.email).trim().toLowerCase().slice(0, 120);
  const nextDisplayName = (updates.displayName ?? admin.displayName).trim().slice(0, 80);
  const nextRole = updates.role ?? admin.role;
  const nextCanAssign = updates.canAssignEmployees ?? admin.canAssignEmployees;
  const nextActive = updates.active ?? admin.active;

  const updatedAssignments = existingAssignments.map((item) =>
    item.id === admin.id
      ? {
          ...item,
          displayName: nextDisplayName,
          role: nextRole,
          canAssignEmployees: nextCanAssign,
          active: nextActive
        }
      : item
  );

  const batch = writeBatch(db);
  batch.update(doc(db, 'admins', admin.id), {
    email: nextEmail,
    displayName: nextDisplayName,
    role: nextRole,
    canAssignEmployees: nextCanAssign,
    active: nextActive,
    updatedAt: serverTimestamp()
  });
  batch.set(doc(db, 'directory', 'admin_assignments'), {
    items: updatedAssignments,
    updatedAt: serverTimestamp()
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSubAdmin(adminKey: string): Promise<void> {
  const path = `admins/${adminKey}`;
  const existingAssignments = await fetchAdminAssignmentsDirectory();
  const target = existingAssignments.find((a) => a.id === adminKey);
  const updatedAssignments = existingAssignments.filter((a) => a.id !== adminKey);

  if (target && target.assignedEmployeeIds.length > 0) {
    const batch = writeBatch(db);
    for (const empId of target.assignedEmployeeIds) {
      batch.delete(doc(db, 'admins', adminKey, 'assignedEmployees', empId));
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/assignedEmployees`);
    }
  }

  try {
    await deleteDoc(doc(db, 'admins', adminKey));
    await setDoc(doc(db, 'directory', 'admin_assignments'), {
      items: updatedAssignments,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveAdminEmployeeAssignments(params: {
  targetAdminKey: string;
  selectedEmployees: DirectoryEmployeeItem[];
  previousEmployeeIds: string[];
  uid: string;
}): Promise<void> {
  const { targetAdminKey, selectedEmployees, previousEmployeeIds, uid } = params;
  const nextIds = selectedEmployees.map((e) => e.id);
  const prevSet = new Set(previousEmployeeIds);
  const nextSet = new Set(nextIds);

  const toAdd = selectedEmployees.filter((e) => !prevSet.has(e.id));
  const toRemoveIds = previousEmployeeIds.filter((id) => !nextSet.has(id));

  const dirAssignments = await fetchAdminAssignmentsDirectory();
  const updatedDirAssignments = dirAssignments.map((item) =>
    item.id === targetAdminKey ? { ...item, assignedEmployeeIds: nextIds } : item
  );

  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  for (const emp of toAdd) {
    operations.push((batch) =>
      batch.set(doc(db, 'admins', targetAdminKey, 'assignedEmployees', emp.id), {
        employeeId: emp.id,
        employeeCode: emp.code.slice(0, 32),
        employeeName: emp.name.slice(0, 120),
        assignedByUid: uid,
        createdAt: serverTimestamp()
      })
    );
  }

  for (const empId of toRemoveIds) {
    operations.push((batch) =>
      batch.delete(doc(db, 'admins', targetAdminKey, 'assignedEmployees', empId))
    );
  }

  operations.push((batch) =>
    batch.update(doc(db, 'admins', targetAdminKey), {
      assignedCount: nextIds.length,
      updatedAt: serverTimestamp()
    })
  );

  operations.push((batch) =>
    batch.set(doc(db, 'directory', 'admin_assignments'), {
      items: updatedDirAssignments,
      updatedAt: serverTimestamp()
    })
  );

  const chunkSize = 350;
  try {
    for (let i = 0; i < operations.length; i += chunkSize) {
      const batch = writeBatch(db);
      const slice = operations.slice(i, i + chunkSize);
      for (const op of slice) {
        op(batch);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `admins/${targetAdminKey}/assignedEmployees`);
  }
}

// ========== Audit Logs & Monthly Archives ==========

export async function fetchXScoreLogs(params: {
  isSuperAdmin: boolean;
  uid: string;
}): Promise<XScoreAuditLog[]> {
  const path = 'xscore_logs';
  try {
    const q = params.isSuperAdmin
      ? query(collection(db, 'xscore_logs'), orderBy('createdAt', 'desc'), limit(200))
      : query(
          collection(db, 'xscore_logs'),
          where('recordedByUid', '==', params.uid),
          limit(200)
        );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<XScoreAuditLog, 'id'>)
    }));
    return list.sort((a, b) => {
      const aSec = (a.createdAt as { seconds?: number } | undefined)?.seconds || 0;
      const bSec = (b.createdAt as { seconds?: number } | undefined)?.seconds || 0;
      return bSec - aSec;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchMonthlyArchives(): Promise<MonthlyArchiveRecord[]> {
  const path = 'monthly_archives';
  try {
    const q = query(collection(db, 'monthly_archives'), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<MonthlyArchiveRecord, 'id'>)
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateXScoreLogEntry(params: {
  log: XScoreAuditLog;
  nextDelta: number;
  nextCategory: string;
  nextReason: string;
  nextDateLabel: string;
  syncEmployeeScore: boolean;
}): Promise<void> {
  const { log, nextDelta, nextCategory, nextReason, nextDateLabel, syncEmployeeScore } = params;
  const path = `xscore_logs/${log.id}`;
  const clampedDelta = Math.max(-1000, Math.min(1000, Math.round(nextDelta)));
  const cleanCategory = (nextCategory.trim() || log.category || 'تعديل إداري').slice(0, 60);
  const cleanReason = (nextReason.trim() || log.reason || 'تعديل').slice(0, 200);
  const cleanDateLabel = nextDateLabel.trim().slice(0, 40);

  const deltaDiff = clampedDelta - (Number(log.delta) || 0);
  const logNewExcess = Math.max(
    0,
    Math.min(100000, (Number(log.previousExcess) || 0) + clampedDelta)
  );
  const logNewDiscount = calculateDiscountFromExcess(logNewExcess);

  const batch = writeBatch(db);
  batch.update(doc(db, 'xscore_logs', log.id), {
    delta: clampedDelta,
    newExcess: logNewExcess,
    newDiscount: logNewDiscount,
    category: cleanCategory,
    reason: cleanReason,
    dateLabel: cleanDateLabel
  });

  if (syncEmployeeScore && log.employeeId) {
    const empSnap = await getDoc(doc(db, 'employees', log.employeeId));
    if (empSnap.exists()) {
      const empData = empSnap.data() as Omit<Employee, 'id'>;
      const currentExcess = Number(empData.excessCount) || 0;
      const updatedEmpExcess = Math.max(0, Math.min(100000, currentExcess + deltaDiff));
      const updatedEmpDiscount =
        deltaDiff === 0
          ? Number(empData.discountPercentage) || 0
          : calculateDiscountFromExcess(updatedEmpExcess);

      const updatedRecentLogs = (empData.recentLogs || []).map((entry) =>
        entry.id === log.id
          ? {
              ...entry,
              delta: clampedDelta,
              category: cleanCategory,
              reason: cleanReason,
              dateLabel: cleanDateLabel
            }
          : entry
      );

      batch.update(doc(db, 'employees', log.employeeId), {
        excessCount: updatedEmpExcess,
        discountPercentage: updatedEmpDiscount,
        recentLogs: updatedRecentLogs,
        updatedAt: serverTimestamp()
      });

      const [dirItems, dirSnap, statsSnap] = await Promise.all([
        fetchDirectoryEmployeesIndex(),
        getDoc(doc(db, 'directory', 'employees_index')),
        getDoc(doc(db, 'stats', 'summary'))
      ]);

      if (dirItems.length > 0 && dirSnap.exists()) {
        const nextDirItems = dirItems.map((item) =>
          item.id === log.employeeId
            ? {
                ...item,
                excessCount: updatedEmpExcess,
                discountPercentage: updatedEmpDiscount
              }
            : item
        );
        const computed = computeSummaryFromItems(nextDirItems);
        batch.update(doc(db, 'directory', 'employees_index'), {
          items: nextDirItems,
          updatedAt: serverTimestamp()
        });
        if (statsSnap.exists()) {
          batch.update(doc(db, 'stats', 'summary'), {
            totalEmployees: computed.totalEmployees,
            avgDiscount: computed.avgDiscount,
            totalExcess: computed.totalExcess,
            employeesWithExcess: computed.employeesWithExcess,
            updatedAt: serverTimestamp()
          });
        }
      }
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteXScoreLogEntry(params: {
  log: XScoreAuditLog;
  syncEmployeeScore: boolean;
}): Promise<void> {
  const { log, syncEmployeeScore } = params;
  const path = `xscore_logs/${log.id}`;
  const batch = writeBatch(db);

  batch.delete(doc(db, 'xscore_logs', log.id));

  if (syncEmployeeScore && log.employeeId) {
    const empSnap = await getDoc(doc(db, 'employees', log.employeeId));
    if (empSnap.exists()) {
      const empData = empSnap.data() as Omit<Employee, 'id'>;
      const currentExcess = Number(empData.excessCount) || 0;
      const updatedEmpExcess = Math.max(
        0,
        Math.min(100000, currentExcess - (Number(log.delta) || 0))
      );
      const updatedEmpDiscount = calculateDiscountFromExcess(updatedEmpExcess);
      const updatedRecentLogs = (empData.recentLogs || []).filter((entry) => entry.id !== log.id);

      batch.update(doc(db, 'employees', log.employeeId), {
        excessCount: updatedEmpExcess,
        discountPercentage: updatedEmpDiscount,
        recentLogs: updatedRecentLogs,
        updatedAt: serverTimestamp()
      });

      const [dirItems, dirSnap, statsSnap] = await Promise.all([
        fetchDirectoryEmployeesIndex(),
        getDoc(doc(db, 'directory', 'employees_index')),
        getDoc(doc(db, 'stats', 'summary'))
      ]);

      if (dirItems.length > 0 && dirSnap.exists()) {
        const nextDirItems = dirItems.map((item) =>
          item.id === log.employeeId
            ? {
                ...item,
                excessCount: updatedEmpExcess,
                discountPercentage: updatedEmpDiscount
              }
            : item
        );
        const computed = computeSummaryFromItems(nextDirItems);
        batch.update(doc(db, 'directory', 'employees_index'), {
          items: nextDirItems,
          updatedAt: serverTimestamp()
        });
        if (statsSnap.exists()) {
          batch.update(doc(db, 'stats', 'summary'), {
            totalEmployees: computed.totalEmployees,
            avgDiscount: computed.avgDiscount,
            totalExcess: computed.totalExcess,
            employeesWithExcess: computed.employeesWithExcess,
            updatedAt: serverTimestamp()
          });
        }
      }
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateMonthlyArchiveRecord(params: {
  archive: MonthlyArchiveRecord;
  title: string;
  records: MonthlyArchiveRecord['records'];
}): Promise<void> {
  const { archive, title, records } = params;
  const path = `monthly_archives/${archive.id}`;
  const cleanTitle = (title.trim() || archive.title).slice(0, 100);
  const cleanRecords = records.slice(0, 1000).map((r) => ({
    id: r.id,
    code: String(r.code || '').slice(0, 32),
    name: String(r.name || '').slice(0, 120),
    excessCount: Math.max(0, Math.min(100000, Math.round(Number(r.excessCount) || 0))),
    discountPercentage: Math.max(0, Math.min(100, Math.round(Number(r.discountPercentage) || 0)))
  }));

  let totalExcess = 0;
  let totalDiscount = 0;
  let discountCount = 0;
  let penalizedEmployees = 0;

  for (const r of cleanRecords) {
    totalExcess += r.excessCount;
    if (r.excessCount > 0 || r.discountPercentage > 0) {
      penalizedEmployees += 1;
    }
    if (r.discountPercentage > 0) {
      totalDiscount += r.discountPercentage;
      discountCount += 1;
    }
  }

  const avgDiscount = discountCount > 0 ? Math.round(totalDiscount / discountCount) : 0;

  try {
    await updateDoc(doc(db, 'monthly_archives', archive.id), {
      title: cleanTitle,
      records: cleanRecords,
      penalizedEmployees,
      totalExcess,
      avgDiscount
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMonthlyArchiveRecord(archiveId: string): Promise<void> {
  const path = `monthly_archives/${archiveId}`;
  try {
    await deleteDoc(doc(db, 'monthly_archives', archiveId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function closeMonthlyCycleAndArchive(params: {
  archiveTitle: string;
  nextCycleLabel: string;
  resetScores: boolean;
  employees: Employee[];
  uid: string;
  closedByName: string;
}): Promise<void> {
  const { archiveTitle, nextCycleLabel, resetScores, employees, uid, closedByName } = params;
  const penalized = employees.filter((e) => e.excessCount > 0 || e.discountPercentage > 0);
  const stats = computeSummaryFromItems(employees);
  const archiveId = `arc_${Date.now()}`;

  try {
    await setDoc(doc(db, 'monthly_archives', archiveId), {
      title: archiveTitle.trim().slice(0, 100),
      totalEmployees: stats.totalEmployees,
      penalizedEmployees: penalized.length,
      totalExcess: stats.totalExcess,
      avgDiscount: stats.avgDiscount,
      records: penalized.slice(0, 1000).map((e) => ({
        id: e.id,
        code: e.code,
        name: e.name,
        excessCount: e.excessCount,
        discountPercentage: e.discountPercentage
      })),
      closedByUid: uid,
      closedByName: closedByName.slice(0, 80),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `monthly_archives/${archiveId}`);
  }

  if (resetScores) {
    const chunkSize = 400;
    for (let i = 0; i < employees.length; i += chunkSize) {
      const chunk = employees.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const emp of chunk) {
        if (emp.excessCount !== 0 || emp.discountPercentage !== 0 || emp.recentLogs.length > 0) {
          batch.update(doc(db, 'employees', emp.id), {
            excessCount: 0,
            discountPercentage: 0,
            recentLogs: [],
            updatedAt: serverTimestamp()
          });
        }
      }
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'employees');
      }
    }

    const cleanItems: DirectoryEmployeeItem[] = employees.map((e) => ({
      id: e.id,
      serial: e.serial,
      code: e.code,
      name: e.name,
      department: e.department,
      excessCount: 0,
      discountPercentage: 0
    }));

    try {
      const metaBatch = writeBatch(db);
      metaBatch.update(doc(db, 'directory', 'employees_index'), {
        items: cleanItems,
        updatedAt: serverTimestamp()
      });
      metaBatch.update(doc(db, 'stats', 'summary'), {
        avgDiscount: 0,
        totalExcess: 0,
        employeesWithExcess: 0,
        cycleLabel: nextCycleLabel.trim().slice(0, 60) || 'دورة جديدة',
        updatedAt: serverTimestamp()
      });
      await metaBatch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'stats/summary');
    }
  }
}

// ========== Full App JSON Export & Import (Super Admin Only) ==========

export async function exportFullAppBackup(): Promise<FullAppBackupPayload> {
  const [stats, departments, employees, admins, assignmentsDir, xscoreLogs, monthlyArchives] =
    await Promise.all([
      fetchStatsSummary(),
      fetchDepartments(),
      fetchAllEmployeesForSuperAdmin(),
      fetchAllAdminsForSuperAdmin(),
      fetchAdminAssignmentsDirectory(),
      fetchXScoreLogs({ isSuperAdmin: true, uid: 'super_admin' }),
      fetchMonthlyArchives()
    ]);

  const assignmentMap = new Map<string, string[]>();
  for (const item of assignmentsDir) {
    assignmentMap.set(item.id, item.assignedEmployeeIds || []);
  }

  return {
    schemaVersion: 'xscore-backup-v1',
    exportedAt: new Date().toISOString(),
    cycleLabel: stats?.cycleLabel || 'الدورة الحالية',
    stats: stats
      ? {
          totalEmployees: stats.totalEmployees,
          avgDiscount: stats.avgDiscount,
          totalExcess: stats.totalExcess,
          employeesWithExcess: stats.employeesWithExcess,
          seedInitialized: stats.seedInitialized,
          cycleLabel: stats.cycleLabel
        }
      : null,
    departments,
    employees: employees.map((e) => ({
      id: e.id,
      serial: e.serial,
      code: e.code,
      name: e.name,
      department: e.department,
      excessCount: e.excessCount,
      discountPercentage: e.discountPercentage,
      recentLogs: e.recentLogs || [],
      assignedAdminKeys: e.assignedAdminKeys || []
    })),
    admins: admins.map((a) => ({
      id: a.id,
      email: a.email,
      displayName: a.displayName,
      role: a.role,
      canAssignEmployees: a.canAssignEmployees,
      active: a.active,
      assignedCount: a.assignedCount,
      createdByEmail: a.createdByEmail,
      assignedEmployeeIds: assignmentMap.get(a.id) || []
    })),
    xscoreLogs: xscoreLogs.map((l) => ({
      id: l.id,
      employeeId: l.employeeId,
      employeeCode: l.employeeCode,
      employeeName: l.employeeName,
      delta: l.delta,
      previousExcess: l.previousExcess,
      newExcess: l.newExcess,
      previousDiscount: l.previousDiscount,
      newDiscount: l.newDiscount,
      reason: l.reason,
      category: l.category,
      dateLabel: l.dateLabel,
      recordedByUid: l.recordedByUid,
      recordedByName: l.recordedByName,
      recordedByRole: l.recordedByRole
    })),
    monthlyArchives: monthlyArchives.map((arc) => ({
      id: arc.id,
      title: arc.title,
      totalEmployees: arc.totalEmployees,
      penalizedEmployees: arc.penalizedEmployees,
      totalExcess: arc.totalExcess,
      avgDiscount: arc.avgDiscount,
      records: arc.records || [],
      closedByUid: arc.closedByUid,
      closedByName: arc.closedByName
    }))
  };
}

export async function importFullAppBackup(params: {
  payload: FullAppBackupPayload;
  uid: string;
  superAdminEmail: string;
  replaceExisting: boolean;
}): Promise<{
  employeesCount: number;
  departmentsCount: number;
  adminsCount: number;
  logsCount: number;
  archivesCount: number;
}> {
  const { payload, uid, superAdminEmail, replaceExisting } = params;
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  // Optional cleanup of existing records when replaceExisting is enabled
  if (replaceExisting) {
    const [existingEmployees, existingAdmins, existingLogs, existingArchives] = await Promise.all([
      fetchAllEmployeesForSuperAdmin(),
      fetchAllAdminsForSuperAdmin(),
      fetchXScoreLogs({ isSuperAdmin: true, uid }),
      fetchMonthlyArchives()
    ]);

    const incomingEmpIds = new Set(payload.employees.map((e) => sanitizeId(e.id)));
    const incomingAdminIds = new Set(payload.admins.map((a) => sanitizeId(a.id)));
    const incomingLogIds = new Set(payload.xscoreLogs.map((l) => sanitizeId(l.id)));
    const incomingArchiveIds = new Set(payload.monthlyArchives.map((m) => sanitizeId(m.id)));

    for (const emp of existingEmployees) {
      if (!incomingEmpIds.has(emp.id)) {
        operations.push((batch) => batch.delete(doc(db, 'employees', emp.id)));
      }
    }

    const existingAssignDir = await fetchAdminAssignmentsDirectory();
    for (const adm of existingAdmins) {
      const assignEntry = existingAssignDir.find((x) => x.id === adm.id);
      if (assignEntry) {
        for (const empId of assignEntry.assignedEmployeeIds || []) {
          operations.push((batch) =>
            batch.delete(doc(db, 'admins', adm.id, 'assignedEmployees', empId))
          );
        }
      }
      if (!incomingAdminIds.has(adm.id)) {
        operations.push((batch) => batch.delete(doc(db, 'admins', adm.id)));
      }
    }

    for (const l of existingLogs) {
      if (!incomingLogIds.has(l.id)) {
        operations.push((batch) => batch.delete(doc(db, 'xscore_logs', l.id)));
      }
    }

    for (const arc of existingArchives) {
      if (!incomingArchiveIds.has(arc.id)) {
        operations.push((batch) => batch.delete(doc(db, 'monthly_archives', arc.id)));
      }
    }
  }

  // 1. Departments
  const deptSeen = new Set<string>();
  const cleanDepts: DepartmentItem[] = [];
  for (const d of payload.departments || []) {
    const name = String(d.name || '').trim().slice(0, 80);
    if (!name || deptSeen.has(name)) continue;
    deptSeen.add(name);
    cleanDepts.push({
      id: sanitizeId(d.id || `dept_${cleanDepts.length + 1}`),
      name
    });
  }
  const finalDepts = cleanDepts.length > 0 ? cleanDepts.slice(0, 200) : getDefaultDepartmentItems();
  operations.push((batch) =>
    batch.set(doc(db, 'directory', 'departments'), {
      items: finalDepts,
      updatedAt: serverTimestamp()
    })
  );

  // 2. Employees & Directory Index
  const dirEmployeeItems: DirectoryEmployeeItem[] = [];
  const validEmployeeIds = new Set<string>();

  for (let i = 0; i < (payload.employees || []).length; i += 1) {
    const emp = payload.employees[i];
    const name = String(emp.name || '').trim().slice(0, 120);
    if (!name) continue;
    const serial = Math.max(0, Math.min(1000000, Math.round(Number(emp.serial) || i + 1)));
    const code = String(emp.code || '').trim().slice(0, 32);
    const empId = emp.id ? sanitizeId(emp.id) : makeEmployeeDocId(code, serial);
    const department = (String(emp.department || 'عام').trim() || 'عام').slice(0, 80);
    const excessCount = Math.max(0, Math.min(100000, Math.round(Number(emp.excessCount) || 0)));
    const discountPercentage = Math.max(
      0,
      Math.min(100, Math.round(Number(emp.discountPercentage) || 0))
    );
    const recentLogs = Array.isArray(emp.recentLogs) ? emp.recentLogs.slice(0, 50) : [];
    const assignedAdminKeys = Array.isArray(emp.assignedAdminKeys)
      ? emp.assignedAdminKeys.slice(0, 15).map((k) => sanitizeId(String(k)))
      : [];

    validEmployeeIds.add(empId);
    dirEmployeeItems.push({
      id: empId,
      serial,
      code,
      name,
      department,
      excessCount,
      discountPercentage
    });

    operations.push((batch) =>
      batch.set(doc(db, 'employees', empId), {
        serial,
        code,
        name,
        department,
        excessCount,
        discountPercentage,
        recentLogs,
        assignedAdminKeys,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  }

  const sortedDirItems = dirEmployeeItems.sort((a, b) => a.serial - b.serial).slice(0, 2000);
  operations.push((batch) =>
    batch.set(doc(db, 'directory', 'employees_index'), {
      items: sortedDirItems,
      updatedAt: serverTimestamp()
    })
  );

  // 3. Admins & Assignments
  const dirAssignments: AdminAssignmentDirectoryItem[] = [];
  let adminsCount = 0;

  for (const adm of payload.admins || []) {
    const email = String(adm.email || '').trim().toLowerCase().slice(0, 120);
    const displayName = String(adm.displayName || '').trim().slice(0, 80);
    if (!email || !displayName) continue;

    const adminKey = sanitizeId(adm.id || `adm_${adminsCount + 1}`);
    const role: 'assistant_admin' | 'supervisor' =
      adm.role === 'assistant_admin' ? 'assistant_admin' : 'supervisor';
    const assignedIds =
      role === 'supervisor'
        ? (adm.assignedEmployeeIds || [])
            .map((id) => sanitizeId(String(id)))
            .filter((id) => validEmployeeIds.has(id))
        : [];

    adminsCount += 1;

    operations.push((batch) =>
      batch.set(doc(db, 'admins', adminKey), {
        email,
        displayName,
        role,
        canAssignEmployees: Boolean(adm.canAssignEmployees),
        active: adm.active !== false,
        assignedCount: assignedIds.length,
        createdByEmail: superAdminEmail.toLowerCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );

    dirAssignments.push({
      id: adminKey,
      displayName,
      role,
      canAssignEmployees: Boolean(adm.canAssignEmployees),
      active: adm.active !== false,
      assignedEmployeeIds: assignedIds
    });

    for (const empId of assignedIds) {
      const empItem = sortedDirItems.find((e) => e.id === empId);
      if (!empItem) continue;
      operations.push((batch) =>
        batch.set(doc(db, 'admins', adminKey, 'assignedEmployees', empId), {
          employeeId: empId,
          employeeCode: empItem.code.slice(0, 32),
          employeeName: empItem.name.slice(0, 120),
          assignedByUid: uid,
          createdAt: serverTimestamp()
        })
      );
    }
  }

  operations.push((batch) =>
    batch.set(doc(db, 'directory', 'admin_assignments'), {
      items: dirAssignments,
      updatedAt: serverTimestamp()
    })
  );

  // 4. Stats Summary
  const computed = computeSummaryFromItems(sortedDirItems);
  const cycleLabel =
    String(payload.cycleLabel || payload.stats?.cycleLabel || 'الدورة الحالية').slice(0, 60) ||
    'الدورة الحالية';

  operations.push((batch) =>
    batch.set(doc(db, 'stats', 'summary'), {
      ...computed,
      seedInitialized: sortedDirItems.length > 0 || Boolean(payload.stats?.seedInitialized),
      cycleLabel,
      updatedAt: serverTimestamp()
    })
  );

  // 5. Audit Logs & Monthly Archives (Phase 2: committed after employees/admins exist for rules exists() checks)
  const phase2Operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  let logsCount = 0;
  for (const log of payload.xscoreLogs || []) {
    const empId = sanitizeId(String(log.employeeId || ''));
    if (!validEmployeeIds.has(empId)) continue;
    const logId = sanitizeId(String(log.id || `log_${Date.now()}_${logsCount}`));
    logsCount += 1;

    phase2Operations.push((batch) =>
      batch.set(doc(db, 'xscore_logs', logId), {
        employeeId: empId,
        employeeCode: String(log.employeeCode || '').slice(0, 32),
        employeeName: (String(log.employeeName || '').trim() || 'موظف').slice(0, 120),
        delta: Math.max(-1000, Math.min(1000, Number(log.delta) || 0)),
        previousExcess: Math.max(0, Math.min(100000, Number(log.previousExcess) || 0)),
        newExcess: Math.max(0, Math.min(100000, Number(log.newExcess) || 0)),
        previousDiscount: Math.max(0, Math.min(100, Number(log.previousDiscount) || 0)),
        newDiscount: Math.max(0, Math.min(100, Number(log.newDiscount) || 0)),
        reason: (String(log.reason || '').trim() || 'تسجيل مستعاد').slice(0, 200),
        category: (String(log.category || '').trim() || 'تعديل إداري').slice(0, 60),
        dateLabel: String(log.dateLabel || '').slice(0, 40),
        recordedByUid: uid,
        recordedByName: (String(log.recordedByName || '').trim() || 'الأدمن الرئيسي').slice(0, 80),
        recordedByRole: (String(log.recordedByRole || '').trim() || 'super_admin').slice(0, 32),
        createdAt: serverTimestamp()
      })
    );
  }

  let archivesCount = 0;
  for (const arc of payload.monthlyArchives || []) {
    const title = String(arc.title || '').trim().slice(0, 100);
    if (!title) continue;
    const archiveId = sanitizeId(String(arc.id || `arc_${Date.now()}_${archivesCount}`));
    archivesCount += 1;

    phase2Operations.push((batch) =>
      batch.set(doc(db, 'monthly_archives', archiveId), {
        title,
        totalEmployees: Math.max(0, Math.min(100000, Number(arc.totalEmployees) || 0)),
        penalizedEmployees: Math.max(0, Math.min(100000, Number(arc.penalizedEmployees) || 0)),
        totalExcess: Math.max(0, Math.min(10000000, Number(arc.totalExcess) || 0)),
        avgDiscount: Math.max(0, Math.min(100, Number(arc.avgDiscount) || 0)),
        records: Array.isArray(arc.records) ? arc.records.slice(0, 1000) : [],
        closedByUid: uid,
        closedByName: (String(arc.closedByName || '').trim() || 'الأدمن الرئيسي').slice(0, 80),
        createdAt: serverTimestamp()
      })
    );
  }

  const chunkSize = 350;
  try {
    for (let i = 0; i < operations.length; i += chunkSize) {
      const batch = writeBatch(db);
      const slice = operations.slice(i, i + chunkSize);
      for (const op of slice) {
        op(batch);
      }
      await batch.commit();
    }

    for (let i = 0; i < phase2Operations.length; i += chunkSize) {
      const batch = writeBatch(db);
      const slice = phase2Operations.slice(i, i + chunkSize);
      for (const op of slice) {
        op(batch);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'backup_restore');
  }

  return {
    employeesCount: sortedDirItems.length,
    departmentsCount: finalDepts.length,
    adminsCount,
    logsCount,
    archivesCount
  };
}
