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
import { INITIAL_EMPLOYEES_FROM_EXCEL } from '../data/initialEmployees';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  calculateDiscountFromExcess,
  SUPER_ADMIN_EMAIL,
  type AdminAssignmentDirectoryItem,
  type AdminRecord,
  type AdminSession,
  type DirectoryEmployeeItem,
  type Employee,
  type MonthlyArchiveRecord,
  type StatsSummary,
  type XScoreAuditLog,
  type XScoreLogEntry
} from '../types/xscore';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
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
  source: 'firestore' | 'seed-fallback';
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

    // Check if Firestore has been seeded yet; if not, allow read-only fallback from bundled Excel data
    const statsSnap = await getDoc(doc(db, 'stats', 'summary'));
    if (!statsSnap.exists() || !(statsSnap.data() as StatsSummary).seedInitialized) {
      const match = INITIAL_EMPLOYEES_FROM_EXCEL.find((e) => e.code.trim() === code);
      if (match) {
        return {
          employee: {
            id: match.id,
            serial: match.serial,
            code: match.code,
            name: match.name,
            department: 'عام',
            excessCount: match.excessCount,
            discountPercentage: match.discountPercentage,
            recentLogs: match.recentLogs,
            assignedAdminKeys: []
          },
          source: 'seed-fallback'
        };
      }
    }
    return { employee: null, source: 'firestore' };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function getSeedFallbackSummary(): StatsSummary {
  const stats = computeSummaryFromItems(INITIAL_EMPLOYEES_FROM_EXCEL);
  return {
    ...stats,
    seedInitialized: false,
    cycleLabel: 'بيانات الإكسيل المبدئية (بانتظار تهيئة المدير)'
  };
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

  // Fetch assigned employee IDs from directory/admin_assignments
  let assignedEmployeeIds: string[] = [];
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

  return {
    role: adminData.role,
    adminKey: adminDocId,
    displayName: adminData.displayName || user.displayName || email,
    email,
    canAssignEmployees: adminData.canAssignEmployees,
    active: adminData.active,
    assignedEmployeeIds
  };
}

// ========== Super Admin Seeding from Excel Data ==========

export async function seedExcelEmployeesToFirestore(
  cycleLabel = 'الدورة الحالية'
): Promise<StatsSummary> {
  const items: DirectoryEmployeeItem[] = INITIAL_EMPLOYEES_FROM_EXCEL.map((e) => ({
    id: e.id,
    serial: e.serial,
    code: e.code,
    name: e.name.slice(0, 120),
    department: 'عام',
    excessCount: e.excessCount,
    discountPercentage: e.discountPercentage
  }));

  // Chunk writes into batches of 400 (Firestore batch limit is 500)
  const chunkSize = 400;
  for (let i = 0; i < INITIAL_EMPLOYEES_FROM_EXCEL.length; i += chunkSize) {
    const chunk = INITIAL_EMPLOYEES_FROM_EXCEL.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const emp of chunk) {
      const empRef = doc(db, 'employees', emp.id);
      batch.set(empRef, {
        serial: emp.serial,
        code: emp.code.slice(0, 32),
        name: emp.name.slice(0, 120),
        department: 'عام',
        excessCount: emp.excessCount,
        discountPercentage: emp.discountPercentage,
        recentLogs: emp.recentLogs.slice(0, 50),
        assignedAdminKeys: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'employees');
    }
  }

  const computed = computeSummaryFromItems(items);
  const summary: StatsSummary = {
    ...computed,
    seedInitialized: true,
    cycleLabel: cycleLabel.slice(0, 60),
    updatedAt: serverTimestamp()
  };

  try {
    const metaBatch = writeBatch(db);
    metaBatch.set(doc(db, 'directory', 'employees_index'), {
      items,
      updatedAt: serverTimestamp()
    });
    const assignSnap = await getDoc(doc(db, 'directory', 'admin_assignments'));
    if (!assignSnap.exists()) {
      metaBatch.set(doc(db, 'directory', 'admin_assignments'), {
        items: [],
        updatedAt: serverTimestamp()
      });
    }
    metaBatch.set(doc(db, 'stats', 'summary'), summary);
    await metaBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'stats/summary');
  }

  return summary;
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
    return (snap.data().items || []) as DirectoryEmployeeItem[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchAssignedEmployeesByIds(employeeIds: string[]): Promise<Employee[]> {
  if (employeeIds.length === 0) return [];
  const results: Employee[] = [];
  // Fetch individually using allowed single-doc get
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

  // Fetch directory index so we can atomically keep directory & summary accurate
  const dirItems = await fetchDirectoryEmployeesIndex();
  const updatedItems = dirItems.map((item) =>
    item.id === employee.id
      ? { ...item, excessCount: newExcess, discountPercentage: newDiscount }
      : item
  );
  const stats = computeSummaryFromItems(updatedItems);

  const batch = writeBatch(db);

  // 1. Update employee doc (strictly only allowed keys for sub-admin compatibility)
  batch.update(doc(db, 'employees', employee.id), {
    excessCount: newExcess,
    discountPercentage: newDiscount,
    recentLogs: updatedLogs,
    updatedAt: serverTimestamp()
  });

  // 2. Create audit log entry
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

  // 3. Update directory index
  if (dirItems.length > 0) {
    batch.update(doc(db, 'directory', 'employees_index'), {
      items: updatedItems,
      updatedAt: serverTimestamp()
    });
  }

  // 4. Update stats/summary (only allowed keys for sub-admins)
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

// ========== Super Admin Employee CRUD ==========

export async function createOrUpdateEmployee(params: {
  existingEmployee?: Employee;
  code: string;
  name: string;
  department: string;
  serial?: number;
}): Promise<Employee> {
  const { existingEmployee, code, name, department, serial } = params;
  const trimmedCode = code.trim().slice(0, 32);
  const trimmedName = name.trim().slice(0, 120);
  const trimmedDept = (department.trim() || 'عام').slice(0, 80);

  const dirItems = await fetchDirectoryEmployeesIndex();

  if (existingEmployee) {
    const path = `employees/${existingEmployee.id}`;
    const updatedItems = dirItems.map((item) =>
      item.id === existingEmployee.id
        ? { ...item, code: trimmedCode, name: trimmedName, department: trimmedDept }
        : item
    );
    const batch = writeBatch(db);
    batch.update(doc(db, 'employees', existingEmployee.id), {
      code: trimmedCode,
      name: trimmedName,
      department: trimmedDept,
      updatedAt: serverTimestamp()
    });
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
      code: trimmedCode,
      name: trimmedName,
      department: trimmedDept
    };
  }

  const nextSerial =
    serial || (dirItems.reduce((max, item) => Math.max(max, item.serial), 0) + 1);
  const newId = makeEmployeeDocId(trimmedCode, nextSerial);
  const path = `employees/${newId}`;

  // Check if an employee with this code already exists
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
  updates: Partial<Pick<AdminRecord, 'displayName' | 'role' | 'canAssignEmployees' | 'active'>>
): Promise<void> {
  const path = `admins/${admin.id}`;
  const existingAssignments = await fetchAdminAssignmentsDirectory();
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

  // Clean up subcollection entries first
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

  // Fetch current directory/admin_assignments
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
      ? query(collection(db, 'xscore_logs'), orderBy('createdAt', 'desc'), limit(100))
      : query(
          collection(db, 'xscore_logs'),
          where('recordedByUid', '==', params.uid),
          limit(100)
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
    const q = query(collection(db, 'monthly_archives'), orderBy('createdAt', 'desc'), limit(24));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<MonthlyArchiveRecord, 'id'>)
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
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
