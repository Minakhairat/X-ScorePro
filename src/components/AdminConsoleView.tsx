import { useMemo, useState, type FormEvent } from 'react';
import {
  Search,
  PlusCircle,
  UserPlus,
  Download,
  Archive,
  RefreshCw,
  Edit3,
  Trash2,
  X,
  Database,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  type AdminSession,
  type Employee,
  type StatsSummary
} from '../types/xscore';
import {
  closeMonthlyCycleAndArchive,
  createOrUpdateEmployee,
  deleteEmployeeRecord,
  seedExcelEmployeesToFirestore
} from '../lib/xscoreService';

interface AdminConsoleViewProps {
  session: AdminSession;
  uid: string;
  employees: Employee[];
  employeesLoading: boolean;
  summary: StatsSummary | null;
  onRefreshData: () => Promise<void>;
  onOpenRecordModal: (employee: Employee) => void;
}

type StatusFilter = 'all' | 'penalized' | 'clean';

export function AdminConsoleView({
  session,
  uid,
  employees,
  employeesLoading,
  summary,
  onRefreshData,
  onOpenRecordModal
}: AdminConsoleViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add/Edit Employee Modal State (Super Admin only)
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDept, setEmpDept] = useState('عام');

  // Close Month & Archive Modal State (Super Admin only)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveTitle, setArchiveTitle] = useState(() => {
    const now = new Date();
    return `تقرير شهر ${now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`;
  });
  const [nextCycleLabel, setNextCycleLabel] = useState('الدورة الجديدة');
  const [resetScores, setResetScores] = useState(true);

  const isSuperAdmin = session.role === 'super_admin';

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return employees.filter((emp) => {
      if (statusFilter === 'penalized' && emp.excessCount <= 0) return false;
      if (statusFilter === 'clean' && emp.excessCount > 0) return false;
      if (!q) return true;
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        String(emp.serial).includes(q) ||
        (emp.department || '').toLowerCase().includes(q)
      );
    });
  }, [employees, searchTerm, statusFilter]);

  function openNewEmployeeModal() {
    setEditingEmp(null);
    setEmpCode('');
    setEmpName('');
    setEmpDept('عام');
    setEmpModalOpen(true);
  }

  function openEditEmployeeModal(emp: Employee) {
    setEditingEmp(emp);
    setEmpCode(emp.code);
    setEmpName(emp.name);
    setEmpDept(emp.department || 'عام');
    setEmpModalOpen(true);
  }

  async function handleSaveEmployee(e: FormEvent) {
    e.preventDefault();
    if (!empName.trim()) return;
    setBusyAction('save_employee');
    setFeedback(null);
    try {
      await createOrUpdateEmployee({
        existingEmployee: editingEmp || undefined,
        code: empCode,
        name: empName,
        department: empDept
      });
      setEmpModalOpen(false);
      await onRefreshData();
      setFeedback({
        type: 'success',
        text: editingEmp ? 'تم تحديث بيانات الموظف بنجاح.' : 'تم إضافة الموظف الجديد إلى Firebase.'
      });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حفظ بيانات الموظف.' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteEmployee(emp: Employee) {
    setBusyAction(`del_${emp.id}`);
    setFeedback(null);
    try {
      await deleteEmployeeRecord(emp.id);
      await onRefreshData();
      setFeedback({ type: 'success', text: `تم حذف الموظف ${emp.name} من السجل.` });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حذف الموظف.' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImportExcelSeed() {
    setBusyAction('seed');
    setFeedback(null);
    try {
      await seedExcelEmployeesToFirestore(summary?.cycleLabel || 'الدورة الحالية');
      await onRefreshData();
      setFeedback({
        type: 'success',
        text: 'تم استيراد جميع بيانات الموظفين من ملف الإكسيل (244 موظف) وحفظها في Firebase بنجاح.'
      });
    } catch {
      setFeedback({ type: 'error', text: 'حدث خطأ أثناء استيراد البيانات إلى Firebase.' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCloseMonth(e: FormEvent) {
    e.preventDefault();
    if (!archiveTitle.trim()) return;
    setBusyAction('archive');
    setFeedback(null);
    try {
      await closeMonthlyCycleAndArchive({
        archiveTitle,
        nextCycleLabel,
        resetScores,
        employees,
        uid,
        closedByName: session.displayName
      });
      setArchiveModalOpen(false);
      await onRefreshData();
      setFeedback({
        type: 'success',
        text: resetScores
          ? 'تم أرشفة تقرير الشهر وتصفير عداد الأكسات لبداية الدورة الجديدة.'
          : 'تم حفظ نسخة أرشيف الشهر بنجاح.'
      });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر إغلاق الدورة الشهرية.' });
    } finally {
      setBusyAction(null);
    }
  }

  function handleExportCsv() {
    const header = ['م', 'الكود', 'الاسم', 'القسم', 'عدد الاكسات', 'نسبة الخصم %'];
    const rows = filteredEmployees.map((emp) => [
      emp.serial,
      emp.code || '',
      `"${emp.name.replace(/"/g, '""')}"`,
      `"${(emp.department || 'عام').replace(/"/g, '""')}"`,
      emp.excessCount,
      emp.discountPercentage
    ]);
    const csv = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xscore-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const roleLabel =
    session.role === 'super_admin'
      ? 'الأدمن الرئيسي'
      : session.role === 'assistant_admin'
        ? 'أدمن مساعد'
        : 'مشرف محدد';

  return (
    <div className="space-y-6">
      {/* Top Workspace Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-red-600">{roleLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{session.email}</span>
            <span aria-hidden="true">·</span>
            <span>
              النطاق:{' '}
              {isSuperAdmin || (session.role === 'assistant_admin' && session.canAssignEmployees)
                ? `جميع الموظفين (${employees.length})`
                : `الأفراد المعينون (${employees.length})`}
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">
            لوحة تسجيل الـ X-Score المباشر
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={openNewEmployeeModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة موظف</span>
              </button>

              <button
                type="button"
                onClick={() => setArchiveModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Archive className="w-4 h-4 text-red-600" />
                <span>إغلاق الشهر</span>
              </button>

              {(!summary?.seedInitialized || employees.length === 0) && (
                <button
                  type="button"
                  onClick={handleImportExcelSeed}
                  disabled={busyAction === 'seed'}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs sm:text-sm font-semibold hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Database className="w-4 h-4" />
                  <span>{busyAction === 'seed' ? 'جاري الاستيراد...' : 'استيراد بيانات الإكسيل'}</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredEmployees.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV</span>
          </button>

          <button
            type="button"
            onClick={() => void onRefreshData()}
            disabled={employeesLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${employeesLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
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
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Segmented Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو الكود أو القسم..."
              className="w-full pr-10 pl-4 py-2 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto max-w-full overflow-x-auto">
            {(
              [
                { id: 'all', label: `الكل (${employees.length})` },
                {
                  id: 'penalized',
                  label: `بهم أكسات (${employees.filter((e) => e.excessCount > 0).length})`
                },
                {
                  id: 'clean',
                  label: `سجل نظيف (${employees.filter((e) => e.excessCount === 0).length})`
                }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Grid */}
        {employeesLoading ? (
          <div className="p-6 space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <p className="text-sm font-semibold text-slate-800">
              {employees.length === 0
                ? session.role === 'supervisor'
                  ? 'لم يتم تعيين أفراد لحسابك بعد.'
                  : 'لا توجد بيانات موظفين حالياً في قاعدة البيانات.'
                : 'لا توجد نتائج مطابقة للبحث الحالي.'}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              {employees.length === 0 && session.role === 'supervisor'
                ? 'تواصل مع الأدمن الرئيسي أو الأدمن المساعد لاختيار الأفراد التابعين لإشرافك.'
                : 'جرّب تغيير كلمة البحث أو الفلتر.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (iPhone / Android) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const hasExcess = emp.excessCount > 0;
                return (
                  <div key={emp.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="font-mono tabular-nums">#{emp.serial}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold text-slate-700 tabular-nums">
                            {emp.code || 'بدون كود'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{emp.department || 'عام'}</span>
                        </div>
                        <div className="mt-0.5 text-sm font-bold text-slate-900">{emp.name}</div>
                      </div>
                      <div className="text-left shrink-0">
                        <div
                          className={`text-sm font-mono font-bold tabular-nums ${
                            hasExcess ? 'text-red-600' : 'text-slate-800'
                          }`}
                        >
                          {emp.excessCount} X
                        </div>
                        <div
                          className={`text-xs font-mono font-semibold tabular-nums ${
                            hasExcess ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {emp.discountPercentage}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenRecordModal(emp)}
                        className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>تسجيل X</span>
                      </button>

                      {isSuperAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditEmployeeModal(emp)}
                            aria-label="تعديل بيانات الموظف"
                            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteEmployee(emp)}
                            disabled={busyAction === `del_${emp.id}`}
                            aria-label="حذف الموظف"
                            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop High-Density Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                    <th className="py-3 px-4 w-14">م</th>
                    <th className="py-3 px-4 w-28">الكود</th>
                    <th className="py-3 px-4">الاسم</th>
                    <th className="py-3 px-4">القسم</th>
                    <th className="py-3 px-4 text-left w-28">الأكسات</th>
                    <th className="py-3 px-4 text-left w-28">نسبة الخصم</th>
                    <th className="py-3 px-4 w-44">إجراء مباشر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredEmployees.map((emp) => {
                    const hasExcess = emp.excessCount > 0;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                          {emp.serial}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                          {emp.code || <span className="text-slate-400 font-sans text-xs">بدون كود</span>}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{emp.name}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">
                          {emp.department || 'عام'}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-left font-mono font-bold tabular-nums ${
                            hasExcess ? 'text-red-600' : 'text-slate-700'
                          }`}
                        >
                          {emp.excessCount}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-left font-mono font-bold tabular-nums ${
                            hasExcess ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {emp.discountPercentage}%
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenRecordModal(emp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>تسجيل X</span>
                            </button>

                            {isSuperAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditEmployeeModal(emp)}
                                  title="تعديل بيانات الموظف"
                                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteEmployee(emp)}
                                  disabled={busyAction === `del_${emp.id}`}
                                  title="حذف الموظف"
                                  className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Employee Modal */}
      {empModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md max-h-[92dvh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {editingEmp ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  كود الموظف
                </label>
                <input
                  type="text"
                  maxLength={32}
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  disabled={Boolean(editingEmp)}
                  placeholder="مثال: 64010"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-sm disabled:bg-slate-100 focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  maxLength={120}
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="الاسم الثلاثي أو الرباعي"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  القسم / خط الإنتاج
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={empDept}
                  onChange={(e) => setEmpDept(e.target.value)}
                  placeholder="عام / تجميع المبرد / الميكروويف"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={busyAction === 'save_employee'}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {busyAction === 'save_employee' ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Monthly Cycle & Archive Modal */}
      {archiveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md max-h-[92dvh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">إغلاق الدورة الشهرية والأرشفة</h3>
              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCloseMonth} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                سيتم حفظ نسخة كاملة من الأكسات ونسب الخصم الحالية في سجل الأرشيف الشهري لاحتساب
                الحوافز والجزاءات.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  عنوان التقرير الشهري
                </label>
                <input
                  type="text"
                  maxLength={100}
                  required
                  value={archiveTitle}
                  onChange={(e) => setArchiveTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetScores}
                  onChange={(e) => setResetScores(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-600"
                />
                <span>تصفير عداد الأكسات والخصومات لجميع الموظفين لبدء دورة شهرية جديدة</span>
              </label>
              {resetScores && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    اسم الدورة الجديدة
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={nextCycleLabel}
                    onChange={(e) => setNextCycleLabel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setArchiveModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={busyAction === 'archive'}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {busyAction === 'archive' ? 'جاري الأرشفة...' : 'تأكيد الإغلاق والأرشفة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
