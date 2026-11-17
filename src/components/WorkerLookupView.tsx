import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Search,
  RefreshCw,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  PlusCircle,
  Database,
  BellRing,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  DEFAULT_EXCESS_ALERT_THRESHOLD,
  EXCESS_THRESHOLD_OPTIONS,
  getIncentiveStanding,
  getLastMonthExcessAnalysis,
  type AdminSession,
  type Employee,
  type StatsSummary
} from '../types/xscore';
import { lookupEmployeeByCode } from '../lib/xscoreService';

interface WorkerLookupViewProps {
  summary: StatsSummary | null;
  summaryLoading: boolean;
  onRefreshSummary: () => void;
  session: AdminSession;
  canQuickRecordFor: (employee: Employee) => boolean;
  onOpenRecordModal: (employee: Employee) => void;
  lastUpdatedEmployee: Employee | null;
  scopedEmployees?: Employee[];
}

export function WorkerLookupView({
  summary,
  summaryLoading,
  onRefreshSummary,
  session,
  canQuickRecordFor,
  onOpenRecordModal,
  lastUpdatedEmployee,
  scopedEmployees = []
}: WorkerLookupViewProps) {
  const [codeInput, setCodeInput] = useState<string>(() => {
    try {
      return localStorage.getItem('xscore_last_search') || '';
    } catch {
      return '';
    }
  });
  const [alertThreshold, setAlertThreshold] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('xscore_alert_threshold'));
      return Number.isFinite(saved) && saved >= 1 ? saved : DEFAULT_EXCESS_ALERT_THRESHOLD;
    } catch {
      return DEFAULT_EXCESS_ALERT_THRESHOLD;
    }
  });
  const [alertsExpanded, setAlertsExpanded] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchedCode, setSearchedCode] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (lastUpdatedEmployee && employee && lastUpdatedEmployee.id === employee.id) {
      setEmployee(lastUpdatedEmployee);
    }
  }, [lastUpdatedEmployee, employee]);

  function handleThresholdChange(next: number) {
    setAlertThreshold(next);
    try {
      localStorage.setItem('xscore_alert_threshold', String(next));
    } catch {
      // ignore storage errors
    }
  }

  async function runSearch(targetCode: string) {
    const clean = targetCode.trim();
    if (!clean) {
      setErrorMessage('الرجاء إدخال كود الموظف أولاً.');
      return;
    }

    setSearching(true);
    setErrorMessage(null);
    setNotFound(false);
    setSearchedCode(clean);

    try {
      const res = await lookupEmployeeByCode(clean);
      if (res.employee) {
        setEmployee(res.employee);
        setNotFound(false);
        try {
          localStorage.setItem('xscore_last_search', clean);
        } catch {
          // ignore storage failure
        }
      } else {
        setEmployee(null);
        setNotFound(true);
      }
    } catch {
      setErrorMessage('تعذر الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setSearching(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void runSearch(codeInput);
  }

  const flaggedEmployees = useMemo(() => {
    if (scopedEmployees.length === 0) return [];
    return scopedEmployees
      .map((emp) => ({
        emp,
        analysis: getLastMonthExcessAnalysis(emp, alertThreshold)
      }))
      .filter((entry) => entry.analysis.crossed)
      .sort((a, b) => b.analysis.effectiveMonthExcess - a.analysis.effectiveMonthExcess);
  }, [scopedEmployees, alertThreshold]);

  const standing = employee ? getIncentiveStanding(employee.discountPercentage) : null;
  const thresholdAnalysis = employee
    ? getLastMonthExcessAnalysis(employee, alertThreshold)
    : null;
  const allowAdminQuickAction =
    employee && session.role !== 'none' && session.active && canQuickRecordFor(employee);

  const resultCardHighlightClass = thresholdAnalysis?.crossed
    ? thresholdAnalysis.severity === 'critical'
      ? 'border-red-500 ring-2 ring-red-200/80'
      : 'border-amber-400 ring-2 ring-amber-200/70'
    : 'border-slate-200';

  return (
    <div className="space-y-6">
      {/* Live Admin Notification Banner for Threshold Crossings in the Last Month */}
      {session.role !== 'none' && session.active && flaggedEmployees.length > 0 && (
        <section
          aria-label="تنبيهات تجاوز الحد الشهري"
          className="bg-red-50/80 border border-red-200 rounded-xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 text-white shrink-0">
                <BellRing className="w-4 h-4 animate-pulse" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-red-900">
                  تنبيه تجاوز الحد الشهري: {flaggedEmployees.length} موظف تجاوزوا{' '}
                  <span className="font-mono">{alertThreshold} X</span> خلال الشهر الأخير
                </h2>
                <p className="text-xs text-red-700">
                  اضغط على أي موظف لعرض تفاصيله وسجل مخالفاته فوراً.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAlertsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100/60 cursor-pointer self-start sm:self-auto"
            >
              <span>{alertsExpanded ? 'إخفاء القائمة' : 'عرض القائمة'}</span>
              {alertsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {alertsExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {flaggedEmployees.slice(0, 9).map(({ emp, analysis }) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    if (emp.code) {
                      setCodeInput(emp.code);
                      void runSearch(emp.code);
                    } else {
                      setEmployee(emp);
                      setNotFound(false);
                    }
                  }}
                  className={`p-3 rounded-lg border text-right transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                    analysis.severity === 'critical'
                      ? 'bg-white border-red-300 hover:border-red-500'
                      : 'bg-white border-amber-300 hover:border-amber-500'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{emp.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      كود <span className="font-mono font-semibold">{emp.code || `#${emp.serial}`}</span>{' '}
                      · {emp.department || 'عام'}
                    </div>
                  </div>
                  <div className="shrink-0 text-left">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-mono text-xs font-bold tabular-nums ${
                        analysis.severity === 'critical'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {analysis.effectiveMonthExcess} X
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Search Column */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-red-600 mb-2">
              مصنع المبرد الصحراوي والميكروويف · إدارة العمليات
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              استعلام نظام X-Score
            </h1>
            <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
              أدخل كود الموظف للاطلاع الفوري على عدد الأكسات المسجلة، نسبة الخصم الشهرية، وحالة
              استحقاق الحافز.
            </p>

            {summary && !summary.seedInitialized && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Database className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  لم يتم رفع بيانات الموظفين بعد. يمكن للإدارة رفع ملف Excel أو إضافة الموظفين يدوياً
                  من لوحة التحكم.
                </span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-6 space-y-3">
              <label htmlFor="employee-code-search" className="sr-only">
                كود الموظف
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="employee-code-search"
                  type="text"
                  inputMode="numeric"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="أدخل كود الموظف..."
                  autoComplete="off"
                  className="flex-1 min-h-[48px] px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-base placeholder:font-sans placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Search className="w-4 h-4" />
                  <span>{searching ? 'جاري البحث...' : 'بحث'}</span>
                </button>
              </div>

              {errorMessage && (
                <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </p>
              )}
            </form>

            {/* Excess Threshold Selector */}
            <div className="mt-5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <SlidersHorizontal className="w-4 h-4 text-red-600 shrink-0" />
                <span>الحد التنبيهي الشهري:</span>
              </div>
              <select
                aria-label="تحديد الحد التنبيهي للأكسات خلال الشهر"
                value={alertThreshold}
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900 focus:border-red-600 focus:outline-none cursor-pointer"
              >
                {EXCESS_THRESHOLD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} X
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom Summary Strip + Refresh */}
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200 text-center">
              <div className="px-1 sm:px-2">
                <div className="text-lg sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {summaryLoading ? '--' : summary?.totalEmployees ?? '--'}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">إجمالي الموظفين</div>
              </div>
              <div className="px-1 sm:px-2">
                <div className="text-lg sm:text-2xl font-mono font-bold text-red-600 tabular-nums">
                  {summaryLoading ? '--' : `${summary?.avgDiscount ?? 0}%`}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">متوسط الخصم</div>
              </div>
              <div className="px-1 sm:px-2">
                <div className="text-lg sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {summaryLoading ? '--' : summary?.totalExcess ?? '--'}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">إجمالي الأكسات</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefreshSummary}
              disabled={summaryLoading}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-red-600 ${summaryLoading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات المباشرة</span>
            </button>
          </div>
        </section>

        {/* Employee Result Column */}
        <section
          className={`lg:col-span-7 bg-white border rounded-xl p-6 sm:p-8 flex flex-col justify-between transition-all ${resultCardHighlightClass}`}
        >
          {!employee && !notFound && !searching && (
            <div className="my-auto py-12 text-center max-w-md mx-auto">
              <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4">
                <UserCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">نتائج تقييم الموظف</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                أدخل الكود الخاص بك في خانة البحث لعرض رصيد الأكسات الحالي، نسبة الخصم المطبقة،
                وتفاصيل السجل الشهري.
              </p>
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-4 text-xs text-slate-500">
                <span>0 X = حافز كامل 100%</span>
                <span aria-hidden="true">·</span>
                <span>كل 1 X = 1% خصم شهري</span>
              </div>
            </div>
          )}

          {searching && (
            <div className="my-auto py-16 space-y-4">
              <div className="h-7 w-48 bg-slate-100 rounded animate-pulse mx-auto" />
              <div className="h-24 w-full bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-16 w-full bg-slate-100 rounded-lg animate-pulse" />
            </div>
          )}

          {notFound && !searching && (
            <div className="my-auto py-12 text-center max-w-md mx-auto">
              <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">لم يتم العثور على موظف</h2>
              <p className="mt-2 text-sm text-slate-600">
                لا يوجد موظف مسجل بالكود{' '}
                <span className="font-mono font-bold text-red-600">{searchedCode}</span>. تأكد من
                إدخال الكود الصحيح أو راجع الإدارة.
              </p>
            </div>
          )}

          {employee && !searching && standing && thresholdAnalysis && (
            <div className="space-y-6">
              {/* Threshold Alert Banner when Employee Crosses Monthly Excess Threshold */}
              {thresholdAnalysis.crossed && (
                <div
                  role="alert"
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    thresholdAnalysis.severity === 'critical'
                      ? 'bg-red-600 text-white border-red-700'
                      : 'bg-amber-50 text-amber-950 border-amber-300'
                  }`}
                >
                  <BellRing
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      thresholdAnalysis.severity === 'critical'
                        ? 'text-white animate-bounce'
                        : 'text-amber-700 animate-pulse'
                    }`}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-extrabold">
                        {thresholdAnalysis.severity === 'critical'
                          ? `إنذار حرج: تجاوز مرتفع لحد الأكسات الشهري (${thresholdAnalysis.threshold} X)`
                          : `تنبيه: تجاوز حد الأكسات الشهري (${thresholdAnalysis.threshold} X)`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-xs font-bold tabular-nums ${
                          thresholdAnalysis.severity === 'critical'
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-200/80 text-amber-950'
                        }`}
                      >
                        {thresholdAnalysis.overBy > 0
                          ? `+${thresholdAnalysis.overBy} X فوق الحد`
                          : 'وصل للحد التنبيهي'}
                      </span>
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        thresholdAnalysis.severity === 'critical' ? 'text-red-50' : 'text-amber-900'
                      }`}
                    >
                      إجمالي الأكسات المحتسبة خلال الشهر:{' '}
                      <span className="font-mono font-bold">
                        {thresholdAnalysis.effectiveMonthExcess} X
                      </span>
                      {thresholdAnalysis.last30DaysLogsCount > 0 && (
                        <span>
                          {' '}
                          (تم تسجيل {thresholdAnalysis.last30DaysLogsCount} حركات خلال آخر 30 يوماً)
                        </span>
                      )}
                      . يرجى مراجعة المشرف المسؤول فوراً.
                    </p>
                  </div>
                </div>
              )}

              {!thresholdAnalysis.crossed && thresholdAnalysis.nearThreshold && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 flex items-center gap-2.5 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    تنبيه مبكر: الموظف اقترب من الحد التنبيهي الشهري ({thresholdAnalysis.effectiveMonthExcess}{' '}
                    من {thresholdAnalysis.threshold} X — {thresholdAnalysis.progressPct}%).
                  </span>
                </div>
              )}

              {/* Employee Identity Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>الكود:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {employee.code || `م ${employee.serial}`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>القسم / الخط: {employee.department || 'عام'}</span>
                    {thresholdAnalysis.crossed && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                            thresholdAnalysis.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <BellRing className="w-3 h-3" />
                          <span>متجاوز للحد</span>
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{employee.name}</h2>
                </div>

                {allowAdminQuickAction && (
                  <button
                    type="button"
                    onClick={() => onOpenRecordModal(employee)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>تسجيل إكس مباشر</span>
                  </button>
                )}
              </div>

              {/* Monthly Threshold Meter */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">مؤشر الأكسات مقارنة بالحد الشهري</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      thresholdAnalysis.severity === 'critical'
                        ? 'text-red-600'
                        : thresholdAnalysis.crossed || thresholdAnalysis.nearThreshold
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                    }`}
                  >
                    {thresholdAnalysis.effectiveMonthExcess} / {thresholdAnalysis.threshold} X
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      thresholdAnalysis.severity === 'critical'
                        ? 'bg-red-600'
                        : thresholdAnalysis.crossed || thresholdAnalysis.nearThreshold
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                    }`}
                    style={{ width: `${thresholdAnalysis.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Primary Score & Discount Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-xl border ${
                    thresholdAnalysis.crossed
                      ? thresholdAnalysis.severity === 'critical'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-amber-50 border-amber-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-600">عدد الأكسات</div>
                  <div
                    className={`mt-1.5 text-3xl font-mono font-bold tabular-nums ${
                      thresholdAnalysis.severity === 'critical'
                        ? 'text-red-700'
                        : thresholdAnalysis.crossed
                          ? 'text-amber-800'
                          : 'text-slate-900'
                    }`}
                  >
                    {employee.excessCount}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">نقطة مسجلة</div>
                </div>

                <div
                  className={`p-4 rounded-xl border ${
                    employee.discountPercentage > 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-600">نسبة الخصم</div>
                  <div
                    className={`mt-1.5 text-3xl font-mono font-bold tabular-nums ${
                      employee.discountPercentage > 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {employee.discountPercentage}%
                  </div>
                  <div className="mt-1 text-xs text-slate-600">من الحافز الشهري</div>
                </div>

                <div
                  className={`p-4 rounded-xl border ${
                    standing.tone === 'clean'
                      ? 'bg-emerald-50 border-emerald-200'
                      : standing.tone === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-600">حالة الحافز</div>
                  <div
                    className={`mt-1.5 flex items-center gap-1.5 text-sm font-bold ${
                      standing.tone === 'clean'
                        ? 'text-emerald-800'
                        : standing.tone === 'warning'
                          ? 'text-amber-800'
                          : 'text-red-700'
                    }`}
                  >
                    {standing.tone === 'clean' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{standing.label}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{standing.detail}</div>
                </div>
              </div>

              {/* Recent X-Score Log History */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  سجل الأكسات والمخالفات المسجلة
                </h3>
                {employee.recentLogs && employee.recentLogs.length > 0 ? (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                    {employee.recentLogs.slice(0, 10).map((log) => (
                      <div
                        key={log.id}
                        className="px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{log.reason}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{log.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {log.dateLabel || 'مسجل'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>بواسطة: {log.recordedByName}</span>
                          </div>
                        </div>
                        <div
                          className={`font-mono font-bold text-sm tabular-nums whitespace-nowrap shrink-0 ${
                            log.delta > 0 ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {log.delta > 0 ? `+${log.delta} X` : `${log.delta} X`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 text-center text-sm text-slate-600">
                    لا توجد أي مخالفات أو أكسات مسجلة على هذا الموظف خلال الدورة الحالية.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
