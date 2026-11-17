import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { AlertTriangle } from 'lucide-react';
import { TopBar, type AppTab } from './components/TopBar';
import { WorkerLookupView } from './components/WorkerLookupView';
import { PolicySimulatorView } from './components/PolicySimulatorView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { AdminManagementView } from './components/AdminManagementView';
import { AuditAndArchivesView } from './components/AuditAndArchivesView';
import { XScoreModal } from './components/XScoreModal';
import {
  auth,
  db,
  signInWithGooglePopup,
  signOutUser,
  testFirestoreConnection
} from './lib/firebase';
import {
  fetchAllEmployeesForSuperAdmin,
  fetchAssignedEmployeesByIds,
  fetchDepartments,
  fetchDirectoryEmployeesIndex,
  fetchStatsSummary,
  getDefaultDepartmentItems,
  getEmptySummary,
  resolveAdminSession
} from './lib/xscoreService';
import {
  type AdminSession,
  type DepartmentItem,
  type Employee,
  type StatsSummary
} from './types/xscore';

const EMPTY_SESSION: AdminSession = {
  role: 'none',
  adminKey: null,
  displayName: '',
  email: '',
  canAssignEmployees: false,
  active: false,
  assignedEmployeeIds: []
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('lookup');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<AdminSession>(EMPTY_SESSION);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [departments, setDepartments] = useState<DepartmentItem[]>(() =>
    getDefaultDepartmentItems()
  );
  const [adminEmployees, setAdminEmployees] = useState<Employee[]>([]);
  const [adminEmployeesLoading, setAdminEmployeesLoading] = useState(false);

  const [modalEmployee, setModalEmployee] = useState<Employee | null>(null);
  const [lastUpdatedEmployee, setLastUpdatedEmployee] = useState<Employee | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const liveSummary = await fetchStatsSummary();
      if (liveSummary) {
        setSummary(liveSummary);
      } else {
        setSummary(getEmptySummary());
      }
    } catch {
      setSummary(getEmptySummary());
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadAdminEmployees = useCallback(async (activeSession: AdminSession) => {
    if (activeSession.role === 'none' || !activeSession.active) {
      setAdminEmployees([]);
      return;
    }

    setAdminEmployeesLoading(true);
    try {
      const [deptList] = await Promise.all([fetchDepartments()]);
      setDepartments(deptList);

      if (activeSession.role === 'super_admin') {
        const list = await fetchAllEmployeesForSuperAdmin();
        setAdminEmployees(list);
      } else if (activeSession.role === 'assistant_admin') {
        const dirItems = await fetchDirectoryEmployeesIndex();
        setAdminEmployees(
          dirItems.map((item) => ({
            id: item.id,
            serial: item.serial,
            code: item.code,
            name: item.name,
            department: item.department,
            excessCount: item.excessCount,
            discountPercentage: item.discountPercentage,
            recentLogs: [],
            assignedAdminKeys: []
          }))
        );
      } else {
        const list = await fetchAssignedEmployeesByIds(activeSession.assignedEmployeeIds);
        setAdminEmployees(list);
      }
    } finally {
      setAdminEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    void testFirestoreConnection();
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthNotice(null);

      if (!user) {
        setSession(EMPTY_SESSION);
        setAdminEmployees([]);
        setAuthReady(true);
        setActiveTab((prev) =>
          prev === 'admin' || prev === 'admins_rbac' || prev === 'logs' ? 'lookup' : prev
        );
        return;
      }

      try {
        const resolved = await resolveAdminSession(user);
        setSession(resolved);

        if (resolved.role === 'none') {
          setAuthNotice(
            `الحساب (${user.email}) غير مضاف ضمن صلاحيات الإدارة. تواصل مع الأدمن الرئيسي لإضافتك.`
          );
          setAdminEmployees([]);
          setAuthReady(true);
          return;
        }

        if (resolved.role !== 'super_admin') {
          setActiveTab((prev) => (prev === 'admins_rbac' ? 'admin' : prev));
        }

        await Promise.all([loadSummary(), loadAdminEmployees(resolved)]);
      } catch (err) {
        console.error('Auth resolution error:', err);
        setAuthNotice('تعذر التحقق من صلاحيات الحساب. يرجى المحاولة مرة أخرى.');
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [loadAdminEmployees, loadSummary]);

  async function handleSignIn() {
    setAuthBusy(true);
    setAuthNotice(null);
    try {
      await signInWithGooglePopup();
    } catch (err) {
      console.error('Sign in failed:', err);
      setAuthNotice('تم إلغاء تسجيل الدخول أو تعذر فتح نافذة Google.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    try {
      await signOutUser();
      setActiveTab('lookup');
    } finally {
      setAuthBusy(false);
    }
  }

  const refreshAdminWorkspace = useCallback(async () => {
    if (!currentUser) return;
    const freshSession = await resolveAdminSession(currentUser);
    setSession(freshSession);
    await Promise.all([loadSummary(), loadAdminEmployees(freshSession)]);
  }, [currentUser, loadAdminEmployees, loadSummary]);

  function canQuickRecordFor(employeeId: string): boolean {
    if (!session.active || session.role === 'none') return false;
    if (session.role === 'super_admin' || session.role === 'assistant_admin') return true;
    return session.assignedEmployeeIds.includes(employeeId);
  }

  async function handleOpenRecordModal(employee: Employee) {
    if (!employee.recentLogs || employee.recentLogs.length === 0) {
      try {
        const snap = await getDoc(doc(db, 'employees', employee.id));
        if (snap.exists()) {
          setModalEmployee({ id: snap.id, ...(snap.data() as Omit<Employee, 'id'>) });
          return;
        }
      } catch {
        // fallback to passed employee object
      }
    }
    setModalEmployee(employee);
  }

  function handleRecordSuccess(updatedEmp: Employee, newSummary: StatsSummary) {
    setModalEmployee(null);
    setLastUpdatedEmployee(updatedEmp);
    setSummary(newSummary);
    setAdminEmployees((prev) =>
      prev.map((item) => (item.id === updatedEmp.id ? updatedEmp : item))
    );
  }

  function handleDepartmentUpdatedLocal(employeeId: string, department: string) {
    setAdminEmployees((prev) =>
      prev.map((item) => (item.id === employeeId ? { ...item, department } : item))
    );
    if (lastUpdatedEmployee && lastUpdatedEmployee.id === employeeId) {
      setLastUpdatedEmployee({ ...lastUpdatedEmployee, department });
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        session={session}
        isAuthenticated={Boolean(currentUser)}
        authBusy={authBusy || !authReady}
        onSignIn={() => void handleSignIn()}
        onSignOut={() => void handleSignOut()}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {authNotice && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>{authNotice}</span>
          </div>
        )}

        {activeTab === 'lookup' && (
          <WorkerLookupView
            summary={summary}
            summaryLoading={summaryLoading}
            onRefreshSummary={() => void loadSummary()}
            session={session}
            canQuickRecordFor={canQuickRecordFor}
            onOpenRecordModal={(emp) => void handleOpenRecordModal(emp)}
            lastUpdatedEmployee={lastUpdatedEmployee}
            scopedEmployees={adminEmployees}
          />
        )}

        {activeTab === 'policy' && <PolicySimulatorView />}

        {activeTab === 'admin' && session.role !== 'none' && session.active && currentUser && (
          <AdminConsoleView
            session={session}
            uid={currentUser.uid}
            employees={adminEmployees}
            employeesLoading={adminEmployeesLoading}
            summary={summary}
            departments={departments}
            onDepartmentsChanged={setDepartments}
            onDepartmentUpdatedLocal={handleDepartmentUpdatedLocal}
            onRefreshData={refreshAdminWorkspace}
            onOpenRecordModal={(emp) => void handleOpenRecordModal(emp)}
          />
        )}

        {activeTab === 'admins_rbac' && session.role === 'super_admin' && currentUser && (
          <AdminManagementView
            session={session}
            uid={currentUser.uid}
            onAssignmentsChanged={refreshAdminWorkspace}
          />
        )}

        {activeTab === 'logs' && session.role !== 'none' && session.active && currentUser && (
          <AuditAndArchivesView
            session={session}
            uid={currentUser.uid}
            onDataChanged={refreshAdminWorkspace}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} إدارة العمليات · مصنع المبرد الصحراوي والميكروويف
          </span>
          <span>نظام X-Score لتقييم الأداء والحوافز</span>
        </div>
      </footer>

      {modalEmployee && currentUser && session.role !== 'none' && (
        <XScoreModal
          employee={modalEmployee}
          session={session}
          uid={currentUser.uid}
          onClose={() => setModalEmployee(null)}
          onSuccess={handleRecordSuccess}
        />
      )}
    </div>
  );
}
