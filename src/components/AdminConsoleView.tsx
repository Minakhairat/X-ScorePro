import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
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
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Upload,
  Factory,
  FileJson,
  Plus
} from 'lucide-react';
import {
  calculateDiscountFromExcess,
  type AdminSession,
  type DepartmentItem,
  type Employee,
  type ExcelEmployeeImportRow,
  type FullAppBackupPayload,
  type StatsSummary
} from '../types/xscore';
import {
  closeMonthlyCycleAndArchive,
  createOrUpdateEmployee,
  deleteEmployeeRecord,
  exportFullAppBackup,
  importEmployeesFromExcelRows,
  importFullAppBackup,
  saveDepartments,
  updateEmployeeDepartment
} from '../lib/xscoreService';

interface AdminConsoleViewProps {
  session: AdminSession;
  uid: string;
  employees: Employee[];
  employeesLoading: boolean;
  summary: StatsSummary | null;
  departments: DepartmentItem[];
  onDepartmentsChanged: (next: DepartmentItem[]) => void;
  onDepartmentUpdatedLocal: (employeeId: string, department: string) => void;
  onRefreshData: () => Promise<void>;
  onOpenRecordModal: (employee: Employee) => void;
}

type StatusFilter = 'all' | 'penalized' | 'clean';

interface ParsedSheetState {
  fileName: string;
  headers: string[];
  rawRows: Record<string, unknown>[];
  colCode: string;
  colName: string;
  colDept: string;
  colExcess: string;
  colDiscount: string;
  colSerial: string;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\s_-]+/g, '');
}

function guessColumn(headers: string[], candidates: string[]): string {
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (candidates.some((c) => norm === c || norm.includes(c))) {
      return h;
    }
  }
  return '';
}

export function AdminConsoleView({
  session,
  uid,
  employees,
  employeesLoading,
  summary,
  departments,
  onDepartmentsChanged,
  onDepartmentUpdatedLocal,
  onRefreshData,
  onOpenRecordModal
}: AdminConsoleViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [savingDeptForId, setSavingDeptForId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add/Edit Employee Modal State (Super Admin & Assistant Admin)
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDept, setEmpDept] = useState('عام');

  // Excel Upload Modal State (Super Admin & Assistant Admin)
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [parsedSheet, setParsedSheet] = useState<ParsedSheetState | null>(null);
  const [excelImportMode, setExcelImportMode] = useState<'merge' | 'add_new_only'>('merge');

  // Departments / Production Lines Modal State (Super Admin ONLY)
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  // Full JSON Backup Export / Import Modal State (Super Admin ONLY)
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [parsedJsonBackup, setParsedJsonBackup] = useState<FullAppBackupPayload | null>(null);
  const [jsonFileName, setJsonFileName] = useState('');
  const [jsonReplaceExisting, setJsonReplaceExisting] = useState(false);

  // Close Month & Archive Modal State (Super Admin only)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveTitle, setArchiveTitle] = useState(() => {
    const now = new Date();
    return `تقرير شهر ${now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`;
  });
  const [nextCycleLabel, setNextCycleLabel] = useState('الدورة الجديدة');
  const [resetScores, setResetScores] = useState(true);

  const isSuperAdmin = session.role === 'super_admin';
  const canOnboardAndAssignDept = isSuperAdmin || session.role === 'assistant_admin';

  const departmentNames = useMemo(() => {
    const names = new Set<string>(departments.map((d) => d.name));
    if (names.size === 0) names.add('عام');
    for (const emp of employees) {
      if (emp.department && emp.department.trim()) {
        names.add(emp.department.trim());
      }
    }
    return Array.from(names);
  }, [departments, employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return employees.filter((emp) => {
      if (statusFilter === 'penalized' && emp.excessCount <= 0) return false;
      if (statusFilter === 'clean' && emp.excessCount > 0) return false;
      if (deptFilter !== 'ALL' && (emp.department || 'عام') !== deptFilter) return false;
      if (!q) return true;
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        String(emp.serial).includes(q) ||
        (emp.department || '').toLowerCase().includes(q)
      );
    });
  }, [employees, searchTerm, statusFilter, deptFilter]);

  function openNewEmployeeModal() {
    setEditingEmp(null);
    setEmpCode('');
    setEmpName('');
    setEmpDept(departments[0]?.name || 'عام');
    setEmpModalOpen(true);
  }

  function openEditEmployeeModal(emp: Employee) {
    setEditingEmp(emp);
    setEmpCode(emp.code);
    setEmpName(emp.name);
    setEmpDept(emp.department || departments[0]?.name || 'عام');
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
        department: empDept,
        isSuperAdmin
      });
      setEmpModalOpen(false);
      await onRefreshData();
      setFeedback({
        type: 'success',
        text: editingEmp ? 'تم تحديث بيانات الموظف بنجاح.' : 'تم إضافة الموظف الجديد إلى Firebase.'
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_CODE') {
        setFeedback({ type: 'error', text: 'يوجد موظف مسجل بنفس الكود بالفعل.' });
      } else {
        setFeedback({ type: 'error', text: 'تعذر حفظ بيانات الموظف.' });
      }
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

  async function handleRowDepartmentChange(emp: Employee, nextDept: string) {
    if (!canOnboardAndAssignDept || nextDept === (emp.department || 'عام')) return;
    setSavingDeptForId(emp.id);
    setFeedback(null);
    try {
      const saved = await updateEmployeeDepartment(emp.id, nextDept);
      onDepartmentUpdatedLocal(emp.id, saved);
    } catch {
      setFeedback({
        type: 'error',
        text: `تعذر تحديث خط الإنتاج / القسم للموظف ${emp.name}.`
      });
    } finally {
      setSavingDeptForId(null);
    }
  }

  // ========== Excel Parsing & Import ==========

  function handleDownloadExcelTemplate() {
    const templateRows = [
      {
        م: 1,
        الكود: '64010',
        الاسم: 'مثال اسم الموظف',
        'خط الإنتاج / القسم': departments[0]?.name || 'عام',
        'عدد الأكسات': 0
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'xscore-employees-template.xlsx');
  }

  async function handleExcelFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        setFeedback({ type: 'error', text: 'ملف الإكسيل فارغ أو لا يحتوي على أوراق عمل.' });
        return;
      }
      const ws = wb.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      if (rawRows.length === 0) {
        setFeedback({ type: 'error', text: 'لا توجد صفوف بيانات داخل ملف الإكسيل.' });
        return;
      }

      const headers = Object.keys(rawRows[0]);
      setParsedSheet({
        fileName: file.name,
        headers,
        rawRows,
        colCode: guessColumn(headers, ['كود', 'الكود', 'code', 'empcode', 'id']),
        colName: guessColumn(headers, ['الاسم', 'اسم', 'name', 'employeename']),
        colDept: guessColumn(headers, ['القسم', 'قسم', 'خطالانتاج', 'الخط', 'department', 'line']),
        colExcess: guessColumn(headers, ['الاكسات', 'عدداكسات', 'عدداكسا', 'اكس', 'excess', 'xscore', 'x']),
        colDiscount: guessColumn(headers, ['الخصم', 'نسبهالخصم', 'discount']),
        colSerial: guessColumn(headers, ['م', 'مسلسل', 'serial', 'no'])
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'تعذر قراءة ملف الإكسيل. تأكد من أن الملف بصيغة .xlsx أو .xls أو .csv.'
      });
    } finally {
      e.target.value = '';
    }
  }

  const mappedExcelRows = useMemo<ExcelEmployeeImportRow[]>(() => {
    if (!parsedSheet || !parsedSheet.colName) return [];
    const results: ExcelEmployeeImportRow[] = [];

    for (const raw of parsedSheet.rawRows) {
      const name = String(raw[parsedSheet.colName] ?? '').trim();
      if (!name) continue;
      const code = parsedSheet.colCode ? String(raw[parsedSheet.colCode] ?? '').trim() : '';
      const deptRaw = parsedSheet.colDept ? String(raw[parsedSheet.colDept] ?? '').trim() : '';
      const department = deptRaw || departments[0]?.name || 'عام';
      const excessCount = parsedSheet.colExcess
        ? Math.max(0, Math.round(Number(raw[parsedSheet.colExcess]) || 0))
        : 0;
      const discountPercentage = parsedSheet.colDiscount
        ? Math.max(
            0,
            Math.min(100, Math.round(Number(raw[parsedSheet.colDiscount]) || 0))
          )
        : calculateDiscountFromExcess(excessCount);
      const serial = parsedSheet.colSerial
        ? Math.round(Number(raw[parsedSheet.colSerial]) || 0) || undefined
        : undefined;

      results.push({
        serial,
        code,
        name,
        department,
        excessCount,
        discountPercentage
      });
    }

    return results;
  }, [parsedSheet, departments]);

  async function handleConfirmExcelImport() {
    if (mappedExcelRows.length === 0) return;
    setBusyAction('excel_import');
    setFeedback(null);
    try {
      const res = await importEmployeesFromExcelRows({
        rows: mappedExcelRows,
        mode: excelImportMode,
        cycleLabel: summary?.cycleLabel || 'الدورة الحالية',
        isSuperAdmin
      });
      setExcelModalOpen(false);
      setParsedSheet(null);
      await onRefreshData();
      setFeedback({
        type: 'success',
        text: `تم استيراد ملف الإكسيل: إضافة ${res.createdCount} موظف، تحديث ${res.updatedCount}، وتخطي ${res.skippedCount}.`
      });
    } catch (err) {
      let detail = '';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as {
            error?: string;
            operationType?: string;
            path?: string;
            authInfo?: { email?: string | null };
          };
          const parts = [
            parsed?.error,
            parsed?.operationType && parsed?.path ? `${parsed.operationType} @ ${parsed.path}` : '',
            parsed?.authInfo?.email ? `account: ${parsed.authInfo.email} (${session.role})` : ''
          ].filter(Boolean);
          if (parts.length > 0) detail = ` (${parts.join(' | ')})`;
        } catch {
          if (err.message) detail = ` (${err.message})`;
        }
      }
      setFeedback({
        type: 'error',
        text: `حدث خطأ أثناء رفع بيانات ملف الإكسيل إلى Firebase${detail}.`
      });
    } finally {
      setBusyAction(null);
    }
  }

  // ========== Super Admin: Departments / Production Lines ==========

  async function handleAddDepartment(e: FormEvent) {
    e.preventDefault();
    const clean = newDeptName.trim().slice(0, 80);
    if (!clean) return;
    if (departments.some((d) => d.name === clean)) {
      setFeedback({ type: 'error', text: 'هذا القسم أو خط الإنتاج مضاف بالفعل.' });
      return;
    }

    setBusyAction('save_depts');
    setFeedback(null);
    try {
      const nextList: DepartmentItem[] = [
        ...departments,
        { id: `dept_${Date.now().toString(36)}`, name: clean }
      ];
      const saved = await saveDepartments(nextList);
      onDepartmentsChanged(saved);
      setNewDeptName('');
      setFeedback({ type: 'success', text: `تم إضافة خط الإنتاج / القسم "${clean}" بنجاح.` });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حفظ خط الإنتاج الجديد.' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteDepartment(dept: DepartmentItem) {
    if (departments.length <= 1) {
      setFeedback({ type: 'error', text: 'يجب الإبقاء على قسم واحد على الأقل في النظام.' });
      return;
    }
    setBusyAction(`del_dept_${dept.id}`);
    setFeedback(null);
    try {
      const nextList = departments.filter((d) => d.id !== dept.id);
      const saved = await saveDepartments(nextList);
      onDepartmentsChanged(saved);
      setFeedback({ type: 'success', text: `تم حذف "${dept.name}" من قائمة الخطوط والأقسام.` });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حذف القسم.' });
    } finally {
      setBusyAction(null);
    }
  }

  // ========== Super Admin: Full JSON Backup Export & Import ==========

  async function handleExportFullJson() {
    setBusyAction('json_export');
    setFeedback(null);
    try {
      const backup = await exportFullAppBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xscore-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'success',
        text: `تم تصدير النسخة الاحتياطية الكاملة (${backup.employees.length} موظف، ${backup.departments.length} قسم، ${backup.admins.length} مشرف).`
      });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر تصدير ملف النسخة الاحتياطية JSON.' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleJsonFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<FullAppBackupPayload>;
      if (!parsed || !Array.isArray(parsed.employees)) {
        setFeedback({
          type: 'error',
          text: 'ملف JSON غير صالح. يجب أن يحتوي على مصفوفة employees.'
        });
        return;
      }
      setParsedJsonBackup({
        schemaVersion: 'xscore-backup-v1',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        cycleLabel: parsed.cycleLabel || 'الدورة الحالية',
        stats: parsed.stats || null,
        departments: Array.isArray(parsed.departments) ? parsed.departments : [],
        employees: parsed.employees,
        admins: Array.isArray(parsed.admins) ? parsed.admins : [],
        xscoreLogs: Array.isArray(parsed.xscoreLogs) ? parsed.xscoreLogs : [],
        monthlyArchives: Array.isArray(parsed.monthlyArchives) ? parsed.monthlyArchives : []
      });
      setJsonFileName(file.name);
    } catch {
      setFeedback({ type: 'error', text: 'تعذر قراءة ملف JSON. تأكد من صحة تنسيق الملف.' });
    } finally {
      e.target.value = '';
    }
  }

  async function handleConfirmJsonImport() {
    if (!parsedJsonBackup) return;
    setBusyAction('json_import');
    setFeedback(null);
    try {
      const res = await importFullAppBackup({
        payload: parsedJsonBackup,
        uid,
        superAdminEmail: session.email,
        replaceExisting: jsonReplaceExisting
      });
      setJsonModalOpen(false);
      setParsedJsonBackup(null);
      setJsonFileName('');
      await onRefreshData();
      setFeedback({
        type: 'success',
        text: `تم استيراد النسخة الاحتياطية: ${res.employeesCount} موظف، ${res.departmentsCount} قسم، ${res.adminsCount} مشرف، ${res.logsCount} حركة، و${res.archivesCount} أرشيف.`
      });
    } catch {
      setFeedback({ type: 'error', text: 'حدث خطأ أثناء استيراد بيانات JSON إلى Firebase.' });
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
    const header = ['م', 'الكود', 'الاسم', 'خط الإنتاج / القسم', 'عدد الاكسات', 'نسبة الخصم %'];
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
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-red-600">{roleLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{session.email}</span>
            <span aria-hidden="true">·</span>
            <span>
              النطاق:{' '}
              {isSuperAdmin || session.role === 'assistant_admin'
                ? `جميع الموظفين (${employees.length})`
                : session.assignedDepartments.length > 0
                  ? `الخطوط: ${session.assignedDepartments.join('، ')} (${employees.length} موظف)`
                  : `الأفراد المعينون (${employees.length})`}
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">
            لوحة تسجيل الـ X-Score المباشر
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canOnboardAndAssignDept && (
            <>
              <button
                type="button"
                onClick={openNewEmployeeModal}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة موظف يدوياً</span>
              </button>

              <button
                type="button"
                onClick={() => setExcelModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs sm:text-sm font-semibold hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>رفع ملف Excel</span>
              </button>
            </>
          )}

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setDeptModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Factory className="w-4 h-4 text-red-600" />
                <span>خطوط الإنتاج والأقسام</span>
              </button>

              <button
                type="button"
                onClick={() => setJsonModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileJson className="w-4 h-4 text-red-600" />
                <span>تصدير / استيراد JSON</span>
              </button>

              <button
                type="button"
                onClick={() => setArchiveModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Archive className="w-4 h-4 text-red-600" />
                <span>إغلاق الشهر</span>
              </button>
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

      {/* Search, Department & Segmented Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو الكود أو الخط..."
                className="w-full pr-10 pl-4 py-2 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
              />
            </div>

            <select
              aria-label="تصفية حسب خط الإنتاج أو القسم"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:border-red-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">كل خطوط الإنتاج والأقسام</option>
              {departmentNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto max-w-full overflow-x-auto">
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
          <div className="p-12 text-center max-w-lg mx-auto space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              {employees.length === 0
                ? session.role === 'supervisor'
                  ? 'لم يتم تحديد خطوط إنتاج أو أقسام لحسابك بعد (أو لا يوجد موظفون في الخطوط المعينة).'
                  : 'لا توجد بيانات موظفين حالياً في قاعدة البيانات.'
                : 'لا توجد نتائج مطابقة للبحث أو الفلتر الحالي.'}
            </p>
            <p className="text-xs text-slate-500">
              {employees.length === 0 && session.role === 'supervisor'
                ? 'تواصل مع الأدمن الرئيسي لاختيار خطوط الإنتاج والأقسام التابع لها إشرافك.'
                : employees.length === 0 && canOnboardAndAssignDept
                  ? 'يمكنك رفع بيانات الموظفين من ملف Excel (.xlsx / .csv) أو إضافة موظف يدوياً من الأزرار بالأعلى.'
                  : 'جرّب تغيير كلمة البحث أو القسم أو الفلتر.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const hasExcess = emp.excessCount > 0;
                const currentDept = emp.department || 'عام';
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

                    {/* Department Selector per Worker on Mobile */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        خط الإنتاج / القسم
                      </label>
                      {canOnboardAndAssignDept ? (
                        <select
                          value={currentDept}
                          disabled={savingDeptForId === emp.id}
                          onChange={(e) => void handleRowDepartmentChange(emp, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:border-red-600 focus:outline-none disabled:opacity-60"
                        >
                          {!departmentNames.includes(currentDept) && (
                            <option value={currentDept}>{currentDept}</option>
                          )}
                          {departmentNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs font-semibold text-slate-700">{currentDept}</div>
                      )}
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

                      {canOnboardAndAssignDept && (
                        <button
                          type="button"
                          onClick={() => openEditEmployeeModal(emp)}
                          aria-label="تعديل بيانات الموظف"
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteEmployee(emp)}
                          disabled={busyAction === `del_${emp.id}`}
                          aria-label="حذف الموظف"
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                    <th className="py-3 px-4 w-56">خط الإنتاج / القسم</th>
                    <th className="py-3 px-4 text-left w-24">الأكسات</th>
                    <th className="py-3 px-4 text-left w-24">الخصم</th>
                    <th className="py-3 px-4 w-44">إجراء مباشر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredEmployees.map((emp) => {
                    const hasExcess = emp.excessCount > 0;
                    const currentDept = emp.department || 'عام';
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                          {emp.serial}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                          {emp.code || <span className="text-slate-400 font-sans text-xs">بدون كود</span>}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{emp.name}</td>
                        <td className="py-2 px-4">
                          {canOnboardAndAssignDept ? (
                            <select
                              aria-label={`خط الإنتاج للموظف ${emp.name}`}
                              value={currentDept}
                              disabled={savingDeptForId === emp.id}
                              onChange={(e) => void handleRowDepartmentChange(emp, e.target.value)}
                              className="w-full max-w-[210px] px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:border-red-600 focus:outline-none cursor-pointer disabled:opacity-50"
                            >
                              {!departmentNames.includes(currentDept) && (
                                <option value={currentDept}>{currentDept}</option>
                              )}
                              {departmentNames.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-slate-600">{currentDept}</span>
                          )}
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

                            {canOnboardAndAssignDept && (
                              <button
                                type="button"
                                onClick={() => openEditEmployeeModal(emp)}
                                title="تعديل بيانات الموظف"
                                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteEmployee(emp)}
                                disabled={busyAction === `del_${emp.id}`}
                                title="حذف الموظف"
                                className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
                {editingEmp ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد يدوياً'}
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
                  خط الإنتاج / القسم
                </label>
                <select
                  value={empDept}
                  onChange={(e) => setEmpDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:border-red-600 focus:outline-none"
                >
                  {!departmentNames.includes(empDept) && (
                    <option value={empDept}>{empDept}</option>
                  )}
                  {departmentNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
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

      {/* Excel File Upload Modal (Super Admin & Assistant Admin) */}
      {excelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  رفع بيانات الموظفين من ملف Excel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExcelModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-600 leading-relaxed">
                  اختر ملف إكسيل بصيغة <span className="font-mono font-semibold">.xlsx</span> أو{' '}
                  <span className="font-mono font-semibold">.xls</span> أو{' '}
                  <span className="font-mono font-semibold">.csv</span> يحتوي على بيانات الموظفين.
                </div>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تحميل نموذج Excel</span>
                </button>
              </div>

              <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-xl bg-white hover:border-red-400 hover:bg-red-50/20 transition-colors cursor-pointer text-center">
                <Upload className="w-6 h-6 text-red-600" />
                <span className="text-sm font-bold text-slate-800">
                  {parsedSheet ? parsedSheet.fileName : 'اضغط لاختيار ملف Excel من جهازك'}
                </span>
                <span className="text-xs text-slate-500">.xlsx / .xls / .csv</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => void handleExcelFileSelected(e)}
                  className="hidden"
                />
              </label>

              {parsedSheet && (
                <div className="space-y-4">
                  {/* Column Mapping */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        عمود الاسم *
                      </label>
                      <select
                        value={parsedSheet.colName}
                        onChange={(e) =>
                          setParsedSheet({ ...parsedSheet, colName: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="">-- اختر --</option>
                        {parsedSheet.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        عمود الكود
                      </label>
                      <select
                        value={parsedSheet.colCode}
                        onChange={(e) =>
                          setParsedSheet({ ...parsedSheet, colCode: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="">-- غير محدد --</option>
                        {parsedSheet.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        عمود خط الإنتاج / القسم
                      </label>
                      <select
                        value={parsedSheet.colDept}
                        onChange={(e) =>
                          setParsedSheet({ ...parsedSheet, colDept: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="">-- الافتراضي (عام) --</option>
                        {parsedSheet.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        عمود عدد الأكسات
                      </label>
                      <select
                        value={parsedSheet.colExcess}
                        onChange={(e) =>
                          setParsedSheet({ ...parsedSheet, colExcess: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="">-- 0 افتراضياً --</option>
                        {parsedSheet.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        عمود نسبة الخصم %
                      </label>
                      <select
                        value={parsedSheet.colDiscount}
                        onChange={(e) =>
                          setParsedSheet({ ...parsedSheet, colDiscount: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="">-- حساب تلقائي (1X=1%) --</option>
                        {parsedSheet.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        وضع الاستيراد
                      </label>
                      <select
                        value={excelImportMode}
                        onChange={(e) =>
                          setExcelImportMode(e.target.value as 'merge' | 'add_new_only')
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="merge">إضافة الجدد وتحديث الموجودين</option>
                        <option value="add_new_only">إضافة الموظفين الجدد فقط</option>
                      </select>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>معاينة الصفوف المقروءة ({mappedExcelRows.length} موظف)</span>
                      <span className="text-slate-500 font-normal">أول 6 صفوف</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600">
                            <th className="py-2 px-3">الكود</th>
                            <th className="py-2 px-3">الاسم</th>
                            <th className="py-2 px-3">القسم / الخط</th>
                            <th className="py-2 px-3">الأكسات</th>
                            <th className="py-2 px-3">الخصم %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {mappedExcelRows.slice(0, 6).map((row, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-mono">{row.code || '-'}</td>
                              <td className="py-2 px-3 font-semibold">{row.name}</td>
                              <td className="py-2 px-3">{row.department}</td>
                              <td className="py-2 px-3 font-mono">{row.excessCount}</td>
                              <td className="py-2 px-3 font-mono">{row.discountPercentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setExcelModalOpen(false);
                  setParsedSheet(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmExcelImport()}
                disabled={mappedExcelRows.length === 0 || busyAction === 'excel_import'}
                className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
              >
                {busyAction === 'excel_import'
                  ? 'جاري الرفع والحفظ...'
                  : `اعتماد ورفع (${mappedExcelRows.length}) موظف`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Only: Production Lines & Departments Modal */}
      {deptModalOpen && isSuperAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[88dvh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900">
                  إدارة خطوط الإنتاج والأقسام (الحساب الرئيسي فقط)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeptModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <form onSubmit={handleAddDepartment} className="flex gap-2">
                <input
                  type="text"
                  maxLength={80}
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="اسم خط الإنتاج أو القسم الجديد..."
                  className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busyAction === 'save_depts'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </form>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="px-4 py-2.5 bg-white flex items-center justify-between gap-3"
                  >
                    <span className="text-sm font-semibold text-slate-800">{dept.name}</span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteDepartment(dept)}
                      disabled={busyAction === `del_dept_${dept.id}` || departments.length <= 1}
                      title="حذف القسم"
                      className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setDeptModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Only: Full JSON Export & Import Modal */}
      {jsonModalOpen && isSuperAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900">
                  تصدير واستيراد كل بيانات البرنامج (JSON)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setJsonModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Export Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-900">1. تصدير نسخة احتياطية كاملة</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  يقوم بتصدير جميع بيانات البرنامج في ملف JSON واحد: الموظفين، خطوط الإنتاج والأقسام،
                  المشرفين وتعييناتهم، سجل الحركات، والأرشيف الشهري.
                </p>
                <button
                  type="button"
                  onClick={() => void handleExportFullJson()}
                  disabled={busyAction === 'json_export'}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {busyAction === 'json_export' ? 'جاري التصدير...' : 'تنزيل ملف JSON الكامل'}
                  </span>
                </button>
              </div>

              {/* Import Section */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-900">2. استيراد نسخة احتياطية (JSON)</h4>
                <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-300 rounded-xl hover:border-red-400 hover:bg-red-50/20 transition-colors cursor-pointer text-center">
                  <Upload className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {jsonFileName || 'اضغط لاختيار ملف النسخة الاحتياطية (.json)'}
                  </span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => void handleJsonFileSelected(e)}
                    className="hidden"
                  />
                </label>

                {parsedJsonBackup && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">الموظفون</div>
                        <div className="font-mono font-bold text-slate-900">
                          {parsedJsonBackup.employees.length}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">الأقسام</div>
                        <div className="font-mono font-bold text-slate-900">
                          {parsedJsonBackup.departments.length}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">المشرفون</div>
                        <div className="font-mono font-bold text-slate-900">
                          {parsedJsonBackup.admins.length}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">سجل الحركات</div>
                        <div className="font-mono font-bold text-slate-900">
                          {parsedJsonBackup.xscoreLogs.length}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">الأرشيف الشهري</div>
                        <div className="font-mono font-bold text-slate-900">
                          {parsedJsonBackup.monthlyArchives.length}
                        </div>
                      </div>
                    </div>

                    <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={jsonReplaceExisting}
                        onChange={(e) => setJsonReplaceExisting(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-600"
                      />
                      <span>
                        استبدال البيانات الحالية بالكامل (حذف أي سجلات غير موجودة في ملف النسخة)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setJsonModalOpen(false);
                  setParsedJsonBackup(null);
                  setJsonFileName('');
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer"
              >
                إغلاق
              </button>
              {parsedJsonBackup && (
                <button
                  type="button"
                  onClick={() => void handleConfirmJsonImport()}
                  disabled={busyAction === 'json_import'}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {busyAction === 'json_import' ? 'جاري الاستيراد...' : 'تأكيد استيراد البيانات'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close Monthly Cycle & Archive Modal */}
      {archiveModalOpen && isSuperAdmin && (
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
