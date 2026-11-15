import { useEffect, useState } from 'react';
import { Archive, History, RefreshCw, Download } from 'lucide-react';
import {
  type AdminSession,
  type MonthlyArchiveRecord,
  type XScoreAuditLog
} from '../types/xscore';
import { fetchMonthlyArchives, fetchXScoreLogs } from '../lib/xscoreService';

interface AuditAndArchivesViewProps {
  session: AdminSession;
  uid: string;
}

export function AuditAndArchivesView({ session, uid }: AuditAndArchivesViewProps) {
  const isSuperAdmin = session.role === 'super_admin';
  const [subTab, setSubTab] = useState<'logs' | 'archives'>('logs');
  const [logs, setLogs] = useState<XScoreAuditLog[]>([]);
  const [archives, setArchives] = useState<MonthlyArchiveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const logList = await fetchXScoreLogs({ isSuperAdmin, uid });
      setLogs(logList);
      if (isSuperAdmin) {
        const archiveList = await fetchMonthlyArchives();
        setArchives(archiveList);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, uid]);

  function exportArchiveCsv(arc: MonthlyArchiveRecord) {
    const header = ['الكود', 'الاسم', 'عدد الاكسات', 'نسبة الخصم %'];
    const rows = arc.records.map((r) => [
      r.code || '',
      `"${r.name.replace(/"/g, '""')}"`,
      r.excessCount,
      r.discountPercentage
    ]);
    const csv = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${arc.title}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-red-600 mb-1">الرقابة والشفافية</div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            سجل تسجيلات X-Score والأرشيف الشهري
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSubTab('logs')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                subTab === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل الحركات</span>
            </button>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setSubTab('archives')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  subTab === 'archives' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>الأرشيف الشهري</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 cursor-pointer"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {subTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-600">
              لا توجد تسجيلات جديدة في سجل الحركات حتى الآن.
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-slate-100">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900">{log.employeeName}</div>
                      <span
                        className={`font-mono font-bold text-sm tabular-nums ${
                          log.delta > 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {log.delta > 0 ? `+${log.delta} X` : `${log.delta} X`}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">{log.category}</span> — {log.reason}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                      <span>
                        كود: <span className="font-mono">{log.employeeCode || '-'}</span> ·{' '}
                        {log.dateLabel} · بواسطة: {log.recordedByName}
                      </span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">
                        الإجمالي: {log.newExcess} X ({log.newDiscount}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">الكود</th>
                      <th className="py-3 px-4">الموظف</th>
                      <th className="py-3 px-4">التصنيف والسبب</th>
                      <th className="py-3 px-4 text-left">التغيير</th>
                      <th className="py-3 px-4 text-left">الإجمالي بعد</th>
                      <th className="py-3 px-4">المسجل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {log.dateLabel}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-700 tabular-nums">
                          {log.employeeCode || '-'}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {log.employeeName}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-xs font-semibold text-slate-700">{log.category}</div>
                          <div className="text-xs text-slate-500">{log.reason}</div>
                        </td>
                        <td
                          className={`py-2.5 px-4 text-left font-mono font-bold tabular-nums whitespace-nowrap ${
                            log.delta > 0 ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {log.delta > 0 ? `+${log.delta} X` : `${log.delta} X`}
                        </td>
                        <td className="py-2.5 px-4 text-left font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {log.newExcess} X ({log.newDiscount}%)
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">
                          {log.recordedByName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {subTab === 'archives' && isSuperAdmin && (
        <div className="space-y-4">
          {loading ? (
            <div className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ) : archives.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-600">
              لم يتم إغلاق أو أرشفة أي دورة شهرية بعد.
            </div>
          ) : (
            archives.map((arc) => (
              <div
                key={arc.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{arc.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span>إجمالي الموظفين: {arc.totalEmployees}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-red-600 font-semibold">
                      موظفون بخصومات: {arc.penalizedEmployees}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>إجمالي الأكسات: {arc.totalExcess}</span>
                    <span aria-hidden="true">·</span>
                    <span>متوسط الخصم: {arc.avgDiscount}%</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => exportArchiveCsv(arc)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold hover:bg-slate-100 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <Download className="w-4 h-4 text-red-600" />
                  <span>تنزيل كشف الجزاءات CSV</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
