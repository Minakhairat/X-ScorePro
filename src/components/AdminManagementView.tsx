import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  UserPlus,
  Check,
  Search,
  Trash2,
  Shield,
  X,
  CheckCircle2,
  AlertTriangle,
  Power,
  Edit3,
  Factory,
  Users
} from 'lucide-react';
import {
  type AdminAssignmentDirectoryItem,
  type AdminRecord,
  type AdminSession,
  type DepartmentItem,
  type DirectoryEmployeeItem
} from '../types/xscore';
import {
  addSubAdmin,
  deleteSubAdmin,
  fetchAdminAssignmentsDirectory,
  fetchAllAdminsForSuperAdmin,
  fetchDepartments,
  fetchDirectoryEmployeesIndex,
  saveAdminDepartmentAssignments,
  updateSubAdminSettings
} from '../lib/xscoreService';

interface AdminManagementViewProps {
  session: AdminSession;
  uid: string;
  onAssignmentsChanged: () => Promise<void>;
}

export function AdminManagementView({
  session,
  onAssignmentsChanged
}: AdminManagementViewProps) {
  const isSuperAdmin = session.role === 'super_admin';

  const [loading, setLoading] = useState(true);
  const [adminsList, setAdminsList] = useState<AdminRecord[]>([]);
  const [assignmentsDir, setAssignmentsDir] = useState<AdminAssignmentDirectoryItem[]>([]);
  const [directoryEmployees, setDirectoryEmployees] = useState<DirectoryEmployeeItem[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);

  // New Sub-Admin form (Super Admin only)
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'assistant_admin' | 'supervisor'>('supervisor');
  const [newCanAssign, setNewCanAssign] = useState(false);
  const [newSelectedDepts, setNewSelectedDepts] = useState<Set<string>>(new Set());
  const [submittingNew, setSubmittingNew] = useState(false);

  // Production Line / Department Scope Picker Modal
  const [pickerTarget, setPickerTarget] = useState<{
    adminKey: string;
    displayName: string;
    previousEmployeeIds: string[];
  } | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [pickerSearch, setPickerSearch] = useState('');
  const [savingPicker, setSavingPicker] = useState(false);

  // Edit Sub-Admin Modal State (Super Admin only)
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'assistant_admin' | 'supervisor'>('supervisor');
  const [editActive, setEditActive] = useState(true);
  const [editDepts, setEditDepts] = useState<Set<string>>(new Set());
  const [savingEdit, setSavingEdit] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [dirEmps, dirAssigns, depts] = await Promise.all([
        fetchDirectoryEmployeesIndex(),
        fetchAdminAssignmentsDirectory(),
        fetchDepartments()
      ]);
      setDirectoryEmployees(dirEmps);
      setAssignmentsDir(dirAssigns);
      setDepartmentsList(depts);

      if (isSuperAdmin) {
        const records = await fetchAllAdminsForSuperAdmin();
        setAdminsList(records);
      }
    } catch {
      setFeedback({ type: 'error', text: 'تعذر تحميل قائمة المشرفين والخطوط والأقسام.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // Build unified list of all production lines / departments with live employee counts
  const departmentStats = useMemo(() => {
    const countMap = new Map<string, number>();

    for (const d of departmentsList) {
      const clean = d.name.trim();
      if (clean && !countMap.has(clean)) {
        countMap.set(clean, 0);
      }
    }

    for (const emp of directoryEmployees) {
      const deptName = (emp.department || 'عام').trim() || 'عام';
      countMap.set(deptName, (countMap.get(deptName) || 0) + 1);
    }

    return Array.from(countMap.entries()).map(([name, employeeCount]) => ({
      name,
      employeeCount
    }));
  }, [departmentsList, directoryEmployees]);

  const countByDeptName = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of departmentStats) {
      map.set(item.name, item.employeeCount);
    }
    return map;
  }, [departmentStats]);

  function countEmployeesForDepartments(deptNames: Iterable<string>): number {
    const set = new Set<string>();
    for (const d of deptNames) {
      const clean = d.trim();
      if (clean) set.add(clean);
    }
    if (set.size === 0) return 0;
    let total = 0;
    for (const emp of directoryEmployees) {
      const dept = (emp.department || 'عام').trim() || 'عام';
      if (set.has(dept)) total += 1;
    }
    return total;
  }

  function toggleNewDept(deptName: string) {
    setNewSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptName)) next.delete(deptName);
      else next.add(deptName);
      return next;
    });
  }

  async function handleAddAdmin(e: FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;
    setSubmittingNew(true);
    setFeedback(null);
    try {
      await addSubAdmin({
        email: newEmail,
        displayName: newName,
        role: newRole,
        canAssignEmployees: newRole === 'assistant_admin' ? true : newCanAssign,
        assignedDepartments: newRole === 'supervisor' ? Array.from(newSelectedDepts) : [],
        directoryEmployees,
        createdByEmail: session.email
      });
      setNewEmail('');
      setNewName('');
      setNewRole('supervisor');
      setNewCanAssign(false);
      setNewSelectedDepts(new Set());
      await loadAll();
      setFeedback({
        type: 'success',
        text:
          newRole === 'supervisor' && newSelectedDepts.size > 0
            ? 'تم إضافة المشرف وربطه بالخطوط والأقسام المحددة بنجاح.'
            : 'تم إضافة المشرف الجديد بنجاح. يمكنك تحديد الخطوط والأقسام التابع لها من القائمة.'
      });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر إضافة المشرف. تأكد من صحة البريد الإلكتروني.' });
    } finally {
      setSubmittingNew(false);
    }
  }

  async function handleToggleActive(admin: AdminRecord) {
    setFeedback(null);
    try {
      await updateSubAdminSettings(admin, { active: !admin.active });
      await loadAll();
    } catch {
      setFeedback({ type: 'error', text: 'تعذر تحديث حالة المشرف.' });
    }
  }

  async function handleToggleRole(admin: AdminRecord) {
    setFeedback(null);
    const nextRole = admin.role === 'assistant_admin' ? 'supervisor' : 'assistant_admin';
    try {
      await updateSubAdminSettings(admin, {
        role: nextRole,
        canAssignEmployees: nextRole === 'assistant_admin'
      });
      await loadAll();
    } catch {
      setFeedback({ type: 'error', text: 'تعذر تغيير الدور.' });
    }
  }

  function openEditAdminModal(admin: AdminRecord) {
    const dirEntry = assignmentsDir.find((a) => a.id === admin.id);
    const currentDepts = admin.assignedDepartments ?? dirEntry?.assignedDepartments ?? [];
    setEditingAdmin(admin);
    setEditEmail(admin.email);
    setEditName(admin.displayName);
    setEditRole(admin.role);
    setEditActive(admin.active);
    setEditDepts(new Set(currentDepts));
  }

  function toggleEditDept(deptName: string) {
    setEditDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptName)) next.delete(deptName);
      else next.add(deptName);
      return next;
    });
  }

  async function handleSaveEditAdmin(e: FormEvent) {
    e.preventDefault();
    if (!editingAdmin || !editEmail.trim() || !editName.trim()) return;
    setSavingEdit(true);
    setFeedback(null);
    try {
      const nextAssignedDepts = editRole === 'supervisor' ? Array.from(editDepts) : [];
      const dirEntry = assignmentsDir.find((a) => a.id === editingAdmin.id);
      await updateSubAdminSettings(editingAdmin, {
        email: editEmail,
        displayName: editName,
        role: editRole,
        canAssignEmployees: editRole === 'assistant_admin',
        active: editActive,
        assignedDepartments: nextAssignedDepts
      });

      if (editRole === 'supervisor') {
        await saveAdminDepartmentAssignments({
          targetAdminKey: editingAdmin.id,
          selectedDepartments: nextAssignedDepts,
          directoryEmployees,
          previousEmployeeIds: dirEntry?.assignedEmployeeIds || []
        });
      }

      setEditingAdmin(null);
      await loadAll();
      await onAssignmentsChanged();
      setFeedback({ type: 'success', text: 'تم تحديث بيانات المشرف والخطوط المخصصة له بنجاح.' });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر تحديث البيانات. تأكد من صحة البريد الإلكتروني.' });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteAdmin(admin: AdminRecord) {
    setFeedback(null);
    try {
      await deleteSubAdmin(admin.id);
      await loadAll();
      setFeedback({ type: 'success', text: `تم حذف ${admin.displayName} من قائمة الإدارة.` });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حذف المشرف.' });
    }
  }

  function openDepartmentPicker(target: {
    adminKey: string;
    displayName: string;
    currentDepartments: string[];
  }) {
    const dirEntry = assignmentsDir.find((a) => a.id === target.adminKey);
    setSelectedDepts(new Set(target.currentDepartments));
    setPickerSearch('');
    setPickerTarget({
      adminKey: target.adminKey,
      displayName: target.displayName,
      previousEmployeeIds: dirEntry?.assignedEmployeeIds || []
    });
  }

  const filteredPickerDepartments = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return departmentStats;
    return departmentStats.filter((d) => d.name.toLowerCase().includes(q));
  }, [departmentStats, pickerSearch]);

  function toggleDepartmentSelection(deptName: string) {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptName)) next.delete(deptName);
      else next.add(deptName);
      return next;
    });
  }

  function selectAllFilteredDepartments() {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      filteredPickerDepartments.forEach((d) => next.add(d.name));
      return next;
    });
  }

  function clearAllFilteredDepartments() {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      filteredPickerDepartments.forEach((d) => next.delete(d.name));
      return next;
    });
  }

  async function handleSaveDepartmentPicker() {
    if (!pickerTarget) return;
    setSavingPicker(true);
    setFeedback(null);
    try {
      const selectedList = Array.from(selectedDepts);
      const { matchedCount } = await saveAdminDepartmentAssignments({
        targetAdminKey: pickerTarget.adminKey,
        selectedDepartments: selectedList,
        directoryEmployees,
        previousEmployeeIds: pickerTarget.previousEmployeeIds
      });
      setPickerTarget(null);
      await loadAll();
      await onAssignmentsChanged();
      setFeedback({
        type: 'success',
        text: `تم حفظ الخطوط والأقسام (${selectedList.length} خط · ${matchedCount} موظف) للمشرف ${pickerTarget.displayName}.`
      });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حفظ صلاحيات الخطوط والأقسام.' });
    } finally {
      setSavingPicker(false);
    }
  }

  const displayAdmins = isSuperAdmin
    ? adminsList.map((a) => {
        const dirItem = assignmentsDir.find((d) => d.id === a.id);
        const assignedDepartments = a.assignedDepartments ?? dirItem?.assignedDepartments ?? [];
        const liveMatchedCount =
          assignedDepartments.length > 0
            ? countEmployeesForDepartments(assignedDepartments)
            : dirItem
              ? dirItem.assignedEmployeeIds.length
              : a.assignedCount;
        return {
          record: a,
          adminKey: a.id,
          displayName: a.displayName,
          email: a.email,
          role: a.role,
          canAssignEmployees: a.canAssignEmployees,
          active: a.active,
          assignedDepartments,
          assignedCount: liveMatchedCount
        };
      })
    : assignmentsDir.map((d) => {
        const assignedDepartments = d.assignedDepartments ?? [];
        const liveMatchedCount =
          assignedDepartments.length > 0
            ? countEmployeesForDepartments(assignedDepartments)
            : d.assignedEmployeeIds.length;
        return {
          record: null as AdminRecord | null,
          adminKey: d.id,
          displayName: d.displayName,
          email: '',
          role: d.role,
          canAssignEmployees: d.canAssignEmployees,
          active: d.active,
          assignedDepartments,
          assignedCount: liveMatchedCount
        };
      });

  const modalMatchedEmployeeCount = useMemo(
    () => countEmployeesForDepartments(selectedDepts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDepts, directoryEmployees]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-xs font-semibold text-red-600 mb-1">
          نظام الصلاحيات وتوزيع خطوط الإنتاج والأقسام
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          إدارة المشرفين وتحديد الخطوط والأقسام المسؤولين عنها
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          يمكن للأدمن الرئيسي إضافة المشرفين والأدمن المساعدين، وتحديد خطوط الإنتاج أو الأقسام لكل
          مشرف ليحصل تلقائياً على صلاحية جميع الموظفين داخل تلك الخطوط (بما فيهم الموظفون المضافون
          أو المنقولون لاحقاً). أما الأدمن المساعد فيحصل تلقائياً على صلاحية كاملة على جميع
          الموظفين.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Sub-Admin Form (Super Admin Only) */}
      {isSuperAdmin && (
        <form
          onSubmit={handleAddAdmin}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <UserPlus className="w-5 h-5 text-red-600" />
            <span>إضافة أدمن مساعد أو مشرف جديد</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                البريد الإلكتروني (Google Gmail)
              </label>
              <input
                type="email"
                required
                dir="ltr"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                الاسم الظاهر
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: م. أحمد محمود"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                مستوى الصلاحية
              </label>
              <select
                value={newRole}
                onChange={(e) => {
                  const val = e.target.value as 'assistant_admin' | 'supervisor';
                  setNewRole(val);
                  setNewCanAssign(val === 'assistant_admin');
                }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:border-red-600 focus:outline-none"
              >
                <option value="supervisor">مشرف محدد (يتحكم في خطوط إنتاج / أقسام محددة)</option>
                <option value="assistant_admin">أدمن مساعد (كل الموظفين + إضافة موظفين)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submittingNew}
                className="w-full min-h-[42px] px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                {submittingNew ? 'جاري الإضافة...' : 'إضافة المشرف'}
              </button>
            </div>
          </div>

          {newRole === 'supervisor' && departmentStats.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-700">
                  تحديد خطوط الإنتاج / الأقسام للمشرف الجديد (اختياري الآن أو بعد الإضافة):
                </span>
                <span className="text-slate-500 font-mono tabular-nums">
                  {newSelectedDepts.size} خط · {countEmployeesForDepartments(newSelectedDepts)} موظف
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {departmentStats.map((dept) => {
                  const checked = newSelectedDepts.has(dept.name);
                  return (
                    <button
                      key={dept.name}
                      type="button"
                      onClick={() => toggleNewDept(dept.name)}
                      className={`px-3 py-2 rounded-lg border text-right flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                        checked
                          ? 'bg-red-50 border-red-400 text-red-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            checked
                              ? 'bg-red-600 border-red-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <span className="truncate">{dept.name}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                        {dept.employeeCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      )}

      {/* Existing Admins & Assignment Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Shield className="w-4 h-4 text-red-600" />
            <span>قائمة المشرفين والمديرين المساعدين ({displayAdmins.length})</span>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : displayAdmins.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-600">
            لم يتم إضافة أي مشرفين أو أدمن مساعدين بعد.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {displayAdmins.map((item) => (
              <div
                key={item.adminKey}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{item.displayName}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span
                      className={`text-xs font-semibold ${
                        item.role === 'assistant_admin' ? 'text-red-600' : 'text-slate-700'
                      }`}
                    >
                      {item.role === 'assistant_admin' ? 'أدمن مساعد' : 'مشرف محدد'}
                    </span>
                    <span className="text-xs text-slate-500">·</span>
                    <span
                      className={`text-xs font-semibold ${
                        item.active ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {item.active ? 'نشط' : 'موقوف مؤقتاً'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {item.email && <span dir="ltr">{item.email}</span>}
                    {item.email && <span aria-hidden="true">·</span>}
                    {item.role === 'assistant_admin' ? (
                      <span className="font-semibold text-emerald-700">
                        النطاق: جميع الموظفين (تلقائياً)
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-700">
                        {item.assignedDepartments.length > 0 ? (
                          <>
                            الخطوط / الأقسام:{' '}
                            <span className="text-slate-900">
                              {item.assignedDepartments.join('، ')}
                            </span>{' '}
                            <span className="font-mono text-red-600 tabular-nums">
                              ({item.assignedCount} موظف)
                            </span>
                          </>
                        ) : (
                          <span className="text-amber-700">
                            لم يتم تحديد خطوط أو أقسام ({item.assignedCount} موظف)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {item.role === 'supervisor' ? (
                    <button
                      type="button"
                      onClick={() =>
                        openDepartmentPicker({
                          adminKey: item.adminKey,
                          displayName: item.displayName,
                          currentDepartments: item.assignedDepartments
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Factory className="w-3.5 h-3.5" />
                      <span>
                        اختيار الخطوط / الأقسام ({item.assignedDepartments.length})
                      </span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold whitespace-nowrap">
                      <Shield className="w-3.5 h-3.5" />
                      <span>صلاحية شاملة لجميع الموظفين</span>
                    </span>
                  )}

                  {isSuperAdmin && item.record && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditAdminModal(item.record!)}
                        title="تعديل بيانات المشرف / الأدمن المساعد"
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleRole(item.record!)}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                      >
                        {item.role === 'assistant_admin' ? 'تحويل لمشرف' : 'ترقية لأدمن مساعد'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleActive(item.record!)}
                        title={item.active ? 'إيقاف الحساب مؤقتاً' : 'تفعيل الحساب'}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDeleteAdmin(item.record!)}
                        title="حذف المشرف"
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Department / Production Line Scope Picker Modal */}
      {pickerTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  تحديد خطوط الإنتاج والأقسام للمشرف: {pickerTarget.displayName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تم تحديد{' '}
                  <span className="font-mono font-bold text-red-600 tabular-nums">
                    {selectedDepts.size}
                  </span>{' '}
                  خط / قسم (يشمل{' '}
                  <span className="font-mono font-bold text-slate-800 tabular-nums">
                    {modalMatchedEmployeeCount}
                  </span>{' '}
                  موظف حالياً)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="ابحث باسم خط الإنتاج أو القسم..."
                  className="w-full pr-9 pl-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={selectAllFilteredDepartments}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={clearAllFilteredDepartments}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء الكل
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredPickerDepartments.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  لا توجد خطوط إنتاج أو أقسام مطابقة. يمكنك إضافة خطوط الإنتاج من لوحة تسجيل الـ
                  X-Score.
                </div>
              ) : (
                filteredPickerDepartments.map((dept) => {
                  const checked = selectedDepts.has(dept.name);
                  return (
                    <button
                      key={dept.name}
                      type="button"
                      onClick={() => toggleDepartmentSelection(dept.name)}
                      className={`w-full px-6 py-3.5 flex items-center justify-between text-right transition-colors cursor-pointer ${
                        checked ? 'bg-red-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            checked
                              ? 'bg-red-600 border-red-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <div className="flex items-center gap-2">
                          <Factory className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-bold text-slate-900">{dept.name}</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-600 tabular-nums">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dept.employeeCount} موظف</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                سيتمكن المشرف تلقائياً من إدارة جميع الموظفين التابعين للخطوط المحددة.
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPickerTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveDepartmentPicker()}
                  disabled={savingPicker}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {savingPicker
                    ? 'جاري الحفظ...'
                    : `حفظ (${selectedDepts.size} خط · ${modalMatchedEmployeeCount} موظف)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Only: Edit Admin Modal */}
      {editingAdmin && isSuperAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md max-h-[92dvh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                تعديل بيانات المشرف / الأدمن المساعد
              </h3>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  الاسم الظاهر
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  البريد الإلكتروني (Google Gmail)
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  مستوى الصلاحية
                </label>
                <select
                  value={editRole}
                  onChange={(e) =>
                    setEditRole(e.target.value as 'assistant_admin' | 'supervisor')
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:border-red-600 focus:outline-none"
                >
                  <option value="supervisor">مشرف محدد (يتحكم في خطوط إنتاج / أقسام محددة)</option>
                  <option value="assistant_admin">أدمن مساعد (كل الموظفين + إضافة موظفين)</option>
                </select>
              </div>

              {editRole === 'supervisor' && departmentStats.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      خطوط الإنتاج / الأقسام المسؤول عنها:
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {countEmployeesForDepartments(editDepts)} موظف
                    </span>
                  </div>
                  <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {departmentStats.map((dept) => {
                      const checked = editDepts.has(dept.name);
                      return (
                        <button
                          key={dept.name}
                          type="button"
                          onClick={() => toggleEditDept(dept.name)}
                          className={`w-full px-3 py-2 flex items-center justify-between text-right text-xs cursor-pointer ${
                            checked ? 'bg-red-50/70 font-bold text-red-900' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                checked
                                  ? 'bg-red-600 border-red-600 text-white'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" />}
                            </span>
                            <span>{dept.name}</span>
                          </span>
                          <span className="font-mono text-slate-500 tabular-nums">
                            {countByDeptName.get(dept.name) ?? 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-600"
                />
                <span>الحساب نشط (مسموح له بالدخول)</span>
              </label>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {savingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
