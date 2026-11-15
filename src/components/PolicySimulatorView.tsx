import { useState } from 'react';
import { Calculator, ShieldCheck, AlertTriangle, TrendingDown } from 'lucide-react';
import { calculateDiscountFromExcess, getIncentiveStanding } from '../types/xscore';

export function PolicySimulatorView() {
  const [baseBonus, setBaseBonus] = useState<number>(2000);
  const [simulatedX, setSimulatedX] = useState<number>(10);

  const discountPct = calculateDiscountFromExcess(simulatedX);
  const deductionAmount = Math.round((baseBonus * discountPct) / 100);
  const netBonus = Math.max(0, baseBonus - deductionAmount);
  const standing = getIncentiveStanding(discountPct);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold text-red-600 mb-1.5">
            آلية عمل نظام X-Score
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            من التقييم اليومي إلى حوافز وجزاءات نهاية الشهر
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
            يعمل النظام بنفس منطق التصنيف الائتماني (i-Score): يبدأ كل موظف الشهر بسجل نظيف
            (0 أكسات) ومؤهل للحصول على 100% من الحافز الشهري، وتُترجم أي ملاحظات أو مخالفات
            مسجلة خلال الشهر إلى نسبة خصم واضحة وعادلة في نهاية الدورة.
          </p>
        </div>

        {/* 3-Step Mechanism Chain */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>01. بداية الشهر (سجل نظيف)</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              يبدأ الموظف برصيد 0 X ونسبة خصم 0%، مع استحقاق كامل للحافز الشهري المقرر لقسمه.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>02. تسجيل الأكسات المباشر</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              عند وقوع مخالفة (تأخير، جودة، سلامة مهنية)، يسجل المشرف أو المدير المسؤول قيمة الإكس
              مع السبب فوراً في النظام.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <TrendingDown className="w-5 h-5 text-red-600 shrink-0" />
              <span>03. تسوية نهاية الشهر</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              تُجمع الأكسات وتُحسب نسبة الخصم (1 X = 1% بحد أقصى 100%)، وتُحفظ في الأرشيف الشهري
              مع تصفير العداد للدورة الجديدة.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Simulator */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <Calculator className="w-5 h-5 text-red-600" />
          <h2 className="text-xl font-bold text-slate-900">حاسبة الحافز والخصم التجريبية</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div>
              <label htmlFor="sim-base-bonus" className="block text-xs font-semibold text-slate-600 mb-1.5">
                قيمة الحافز الشهري الأساسي (جنيه)
              </label>
              <input
                id="sim-base-bonus"
                type="number"
                min={0}
                step={100}
                value={baseBonus}
                onChange={(e) => setBaseBonus(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-mono text-base tabular-nums focus:border-red-600 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                <label htmlFor="sim-x-range">إجمالي عدد الأكسات المسجلة</label>
                <span className="font-mono text-red-600 font-bold text-sm tabular-nums">
                  {simulatedX} X
                </span>
              </div>
              <input
                id="sim-x-range"
                type="range"
                min={0}
                max={100}
                value={simulatedX}
                onChange={(e) => setSimulatedX(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1 tabular-nums">
                <span>0 X</span>
                <span>25 X</span>
                <span>50 X</span>
                <span>75 X</span>
                <span>100 X</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">نسبة الخصم</div>
              <div className="mt-1 text-2xl font-mono font-bold text-red-600 tabular-nums">
                {discountPct}%
              </div>
              <div className="mt-1 text-xs text-slate-500">{standing.label}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">قيمة الجزاء المخصومة</div>
              <div className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">
                {deductionAmount.toLocaleString('en-US')}
              </div>
              <div className="mt-1 text-xs text-slate-500">جنيه مصري</div>
            </div>

            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="text-xs text-red-700 font-semibold">صافي الحافز المستحق</div>
              <div className="mt-1 text-2xl font-mono font-bold text-red-700 tabular-nums">
                {netBonus.toLocaleString('en-US')}
              </div>
              <div className="mt-1 text-xs text-red-700/80">جنيه مصري</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
