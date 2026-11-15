import { useEffect, useState, type FormEvent } from 'react';
import {
  Search,
  RefreshCw,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  PlusCircle,
  Database
} from 'lucide-react';
import {
  getIncentiveStanding,
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
  canQuickRecordFor: (employeeId: string) => boolean;
  onOpenRecordModal: (employee: Employee) => void;
  lastUpdatedEmployee: Employee | null;
}

const SAMPLE_CODES = ['43698', '53753', '50725', '956'];

export function WorkerLookupView({
  summary,
  summaryLoading,
  onRefreshSummary,
  session,
  canQuickRecordFor,
  onOpenRecordModal,
  lastUpdatedEmployee
}: WorkerLookupViewProps) {
  const [codeInput, setCodeInput] = useState<string>(() => {
    try {
      return localStorage.getItem('xscore_last_search') || '';
    } catch {
      return '';
    }
  });
  const [searching, setSearching] = useState<boolean>(false);
  const [searchedCode, setSearchedCode] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync live update if the currently displayed employee was just updated via modal
  useEffect(() => {
    if (lastUpdatedEmployee && employee && lastUpdatedEmployee.id === employee.id) {
      setEmployee(lastUpdatedEmployee);
    }
  }, [lastUpdatedEmployee, employee]);

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

  const standing = employee ? getIncentiveStanding(employee.discountPercentage) : null;
  const allowAdminQuickAction =
    employee && session.role !== 'none' && session.active && canQuickRecordFor(employee.id);

  return (
    <div className="space-y-6">
      {/* Main Split Grid: Search & Summary (Right in RTL) + Employee Result (Left in RTL) */}
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

            {/* Unseeded info notice for Super Admin */}
            {summary && !summary.seedInitialized && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Database className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  يتم العرض حالياً من نسخة الإكسيل المهاجرة. عند دخول المدير الرئيسي لأول مرة سيتم
                  تفعيل المزامنة المباشرة على Firebase تلقائياً.
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
                  placeholder="أدخل كود الموظف (مثال: 43698)"
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

            {/* Quick Sample Codes */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
              <span>أكواد سريعة للتجربة:</span>
              {SAMPLE_CODES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setCodeInput(sample);
                    void runSearch(sample);
                  }}
                  className="font-mono font-semibold text-slate-700 hover:text-red-600 underline underline-offset-4 cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Summary Strip + Refresh */}
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200 text-center">
              <div className="px-2">
                <div className="text-xl sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {summaryLoading ? '--' : summary?.totalEmployees ?? '--'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">إجمالي الموظفين</div>
              </div>
              <div className="px-2">
                <div className="text-xl sm:text-2xl font-mono font-bold text-red-600 tabular-nums">
                  {summaryLoading ? '--' : `${summary?.avgDiscount ?? 0}%`}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">متوسط الخصم</div>
              </div>
              <div className="px-2">
                <div className="text-xl sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {summaryLoading ? '--' : summary?.totalExcess ?? '--'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">إجمالي الأكسات</div>
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
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
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

          {employee && !searching && standing && (
            <div className="space-y-6">
              {/* Employee Identity Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>الكود:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {employee.code || `م ${employee.serial}`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>القسم: {employee.department || 'عام'}</span>
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

              {/* Primary Score & Discount Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500">عدد الأكسات</div>
                  <div className="mt-1.5 text-3xl font-mono font-bold text-slate-900 tabular-nums">
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
