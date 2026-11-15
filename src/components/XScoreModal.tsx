import { useState, type FormEvent } from 'react';
import { X, AlertTriangle, CheckCircle2, Plus, Minus } from 'lucide-react';
import {
  calculateDiscountFromExcess,
  QUICK_X_PRESETS,
  VIOLATION_CATEGORIES,
  type AdminSession,
  type Employee,
  type StatsSummary
} from '../types/xscore';
import { recordEmployeeXScore } from '../lib/xscoreService';

interface XScoreModalProps {
  employee: Employee;
  session: AdminSession;
  uid: string;
  onClose: () => void;
  onSuccess: (updatedEmployee: Employee, newSummary: StatsSummary) => void;
}

export function XScoreModal({
  employee,
  session,
  uid,
  onClose,
  onSuccess
}: XScoreModalProps) {
  const [delta, setDelta] = useState<number>(5);
  const [category, setCategory] = useState<string>(VIOLATION_CATEGORIES[0]);
  const [reason, setReason] = useState<string>('');
  const [overrideDiscount, setOverrideDiscount] = useState<boolean>(false);
  const [customDiscount, setCustomDiscount] = useState<number>(
    calculateDiscountFromExcess(employee.excessCount + 5)
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const previewExcess = Math.max(0, employee.excessCount + delta);
  const previewDiscount = overrideDiscount
    ? Math.max(0, Math.min(100, customDiscount))
    : calculateDiscountFromExcess(previewExcess);

  function handleDeltaChange(nextDelta: number) {
    setDelta(nextDelta);
    if (!overrideDiscount) {
      setCustomDiscount(calculateDiscountFromExcess(Math.max(0, employee.excessCount + nextDelta)));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('يرجى كتابة سبب تسجيل الإكس أو التعديل.');
      return;
    }
    if (delta === 0) {
      setErrorMsg('يرجى تحديد قيمة غير صفرية للإكس.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await recordEmployeeXScore({
        employee,
        delta,
        customDiscountPercentage: overrideDiscount ? previewDiscount : undefined,
        reason: reason.trim(),
        category,
        session,
        uid
      });
      onSuccess(result.updatedEmployee, result.newSummary);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? 'تعذر حفظ التسجيل — تأكد من صلاحياتك على هذا الموظف.'
          : 'حدث خطأ أثناء الحفظ.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="xscore-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 id="xscore-modal-title" className="text-lg font-bold text-slate-900">
              تسجيل X-Score مباشر
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {employee.name} · كود{' '}
              <span className="font-mono font-semibold text-slate-700">
                {employee.code || `#${employee.serial}`}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              اختيار سريع لقيمة الإكس
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_X_PRESETS.map((preset) => {
                const selected = delta === preset.delta;
                return (
                  <button
                    key={preset.delta}
                    type="button"
                    onClick={() => handleDeltaChange(preset.delta)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom numeric step + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="x-delta-input" className="block text-xs font-semibold text-slate-600 mb-1.5">
                عدد الأكسات المضاف / المخصوم
              </label>
              <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => handleDeltaChange(delta - 1)}
                  className="px-3 py-2.5 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="إنقاص 1"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  id="x-delta-input"
                  type="number"
                  value={delta}
                  onChange={(e) => handleDeltaChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-center font-mono font-bold text-base py-2 focus:outline-none tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => handleDeltaChange(delta + 1)}
                  className="px-3 py-2.5 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="زيادة 1"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="x-category-select" className="block text-xs font-semibold text-slate-600 mb-1.5">
                تصنيف الملاحظة
              </label>
              <select
                id="x-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 focus:border-red-600 focus:outline-none"
              >
                {VIOLATION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="x-reason-input" className="block text-xs font-semibold text-slate-600 mb-1.5">
              سبب التسجيل / تفاصيل الموقف
            </label>
            <input
              id="x-reason-input"
              type="text"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تأخير عن خط الإنتاج أو عدم ارتداء مهمات السلامة"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          {/* Optional discount override */}
          <div className="pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={overrideDiscount}
                onChange={(e) => setOverrideDiscount(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-600"
              />
              <span>تحديد نسبة الخصم يدوياً (الافتراضي: 1 إكس = 1% خصم)</span>
            </label>
            {overrideDiscount && (
              <div className="mt-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(parseInt(e.target.value, 10) || 0)}
                  className="w-36 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm tabular-nums focus:border-red-600 focus:outline-none"
                />
                <span className="mr-2 text-xs text-slate-500">%</span>
              </div>
            )}
          </div>

          {/* Live Impact Preview */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs text-slate-500">إجمالي الأكسات الجديد</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                  {previewExcess}
                </span>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  (السابق: {employee.excessCount})
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">نسبة الخصم الجديدة</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-mono font-bold text-red-600 tabular-nums">
                  {previewDiscount}%
                </span>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  (السابق: {employee.discountPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'جاري الحفظ...' : 'اعتماد وحفظ الإكس'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
