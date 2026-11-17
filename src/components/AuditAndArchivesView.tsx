import { useEffect, useState, type FormEvent } from 'react';
import {
  Archive,
  History,
  RefreshCw,
  Download,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  calculateDiscountFromExcess,
  VIOLATION_CATEGORIES,
  type AdminSession,
  type MonthlyArchiveRecord,
  type XScoreAuditLog
} from '../types/xscore';
import {
  deleteMonthlyArchiveRecord,
  deleteXScoreLogEntry,
  fetchMonthlyArchives,
  fetchXScoreLogs,
  updateMonthlyArchiveRecord,
  updateXScoreLogEntry
} from '../lib/xscoreService';

interface AuditAndArchivesViewProps {
  session: AdminSession;
  uid: string;
  onDataChanged?: () => Promise<void>;
}

export function AuditAndArchivesView({
  session,
  uid,
  onDataChanged
}: AuditAndArchivesViewProps) {
  const isSuperAdmin = session.role === 'super_admin';
  const [subTab, setSubTab] = useState<'logs' | 'archives'>('logs');
  const [logs, setLogs] = useState<XScoreAuditLog[]>([]);
  const [archives, setArchives] = useState<MonthlyArchiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Log Modal State (Super Admin ONLY)
  const [editingLog, setEditingLog] = useState<XScoreAuditLog | null>(null);
  const [editLogDelta, setEditLogDelta] = useState<number>(0);
  const [editLogCategory, setEditLogCategory] = useState<string>('');
  const [editLogReason, setEditLogReason] = useState<string>('');
  const [editLogDateLabel, setEditLogDateLabel] = useState<string>('');
  const [syncScoreOnEdit, setSyncScoreOnEdit] = useState<boolean>(true);

  // Delete Log Confirmation State (Super Admin ONLY)
  const [deletingLog, setDeletingLog] = useState<XScoreAuditLog | null>(null);
  const [syncScoreOnDelete, setSyncScoreOnDelete] = useState<boolean>(true);

  // Edit Archive Modal State (Super Admin ONLY)
  const [editingArchive, setEditingArchive] = useState<MonthlyArchiveRecord | null>(null);
  const [editArchiveTitle, setEditArchiveTitle] = useState<string>('');
  const [editArchiveRecords, setEditArchiveRecords] = useState<MonthlyArchiveRecord['records']>([]);

  // Delete Archive Confirmation State (Super Admin ONLY)
  const [deletingArchive, setDeletingArchive] = useState<MonthlyArchiveRecord | null>(null);

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

  function openEditLogModal(log: XScoreAuditLog) {
    if (!isSuperAdmin) return;
    setEditingLog(log);
    setEditLogDelta(log.delta);
    setEditLogCategory(log.category);
    setEditLogReason(log.reason);
    setEditLogDateLabel(log.dateLabel || '');
    setSyncScoreOnEdit(true);
  }

  async function handleSaveLogEdit(e: FormEvent) {
    e.preventDefault();
    if (!isSuperAdmin || !editingLog) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await updateXScoreLogEntry({
        log: editingLog,
        nextDelta: editLogDelta,
        nextCategory: editLogCategory,
        nextReason: editLogReason,
        nextDateLabel: editLogDateLabel,
        syncEmployeeScore: syncScoreOnEdit
      });
      setEditingLog(null);
      await loadData();
      if (syncScoreOnEdit && onDataChanged) {
        await onDataChanged();
      }
      setFeedback({ type: 'success', text: 'تم تعديل حركة الـ X-Score وتحديث Firebase بنجاح.' });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حفظ تعديل الحركة في قاعدة البيانات.' });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleConfirmDeleteLog() {
    if (!isSuperAdmin || !deletingLog) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await deleteXScoreLogEntry({
        log: deletingLog,
        syncEmployeeScore: syncScoreOnDelete
      });
      setDeletingLog(null);
      await loadData();
      if (syncScoreOnDelete && onDataChanged) {
        await onDataChanged();
      }
      setFeedback({ type: 'success', text: 'تم حذف الحركة من السجل وتحديث Firebase بنجاح.' });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حذف الحركة من قاعدة البيانات.' });
    } finally {
      setBusyAction(false);
    }
  }

  function openEditArchiveModal(arc: MonthlyArchiveRecord) {
    if (!isSuperAdmin) return;
    setEditingArchive(arc);
    setEditArchiveTitle(arc.title);
    setEditArchiveRecords(arc.records.map((r) => ({ ...r })));
  }

  function handleArchiveRecordFieldChange(
    idx: number,
    field: 'excessCount' | 'discountPercentage',
    value: number
  ) {
    setEditArchiveRecords((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (field === 'excessCount') {
          const nextExcess = Math.max(0, Math.round(value) || 0);
          return {
            ...row,
            excessCount: nextExcess,
            discountPercentage: calculateDiscountFromExcess(nextExcess)
          };
        }
        return {
          ...row,
          discountPercentage: Math.max(0, Math.min(100, Math.round(value) || 0))
        };
      })
    );
  }

  function handleRemoveArchiveRow(idx: number) {
    setEditArchiveRecords((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveArchiveEdit(e: FormEvent) {
    e.preventDefault();
    if (!isSuperAdmin || !editingArchive) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await updateMonthlyArchiveRecord({
        archive: editingArchive,
        title: editArchiveTitle,
        records: editArchiveRecords
      });
      setEditingArchive(null);
      await loadData();
      setFeedback({ type: 'success', text: 'تم تعديل الأرشيف الشهري وحفظه في Firebase بنجاح.' });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر تعديل الأرشيف الشهري.' });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleConfirmDeleteArchive() {
    if (!isSuperAdmin || !deletingArchive) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await deleteMonthlyArchiveRecord(deletingArchive.id);
      setDeletingArchive(null);
      await loadData();
      setFeedback({ type: 'success', text: 'تم حذف الأرشيف الشهري من Firebase بنجاح.' });
    } catch {
      setFeedback({ type: 'error', text: 'تعذر حذف الأرشيف الشهري.' });
    } finally {
      setBusyAction(false);
    }
  }

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
          <div className="text-xs font-semibold text-red-600 mb-1">
            الرقابة والشفافية{isSuperAdmin ? ' · صلاحية التعديل والحذف للحساب الرئيسي' : ''}
          </div>
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
                  <div key={log.id} className="p-4 space-y-2">
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
                    {isSuperAdmin && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openEditLogModal(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingLog(log);
                            setSyncScoreOnDelete(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    )}
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
                      {isSuperAdmin && <th className="py-3 px-4 w-28">إدارة</th>}
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
                        {isSuperAdmin && (
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditLogModal(log)}
                                title="تعديل الحركة"
                                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingLog(log);
                                  setSyncScoreOnDelete(true);
                                }}
                                title="حذف الحركة"
                                className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
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
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
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
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() => openEditArchiveModal(arc)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل الأرشيف</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingArchive(arc)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-semibold hover:bg-red-50 cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportArchiveCsv(arc)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-4 h-4 text-red-600" />
                    <span>تنزيل CSV</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Super Admin Only: Edit Log Modal */}
      {editingLog && isSuperAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md max-h-[92dvh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">تعديل حركة X-Score</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingLog.employeeName} · كود {editingLog.employeeCode || '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveLogEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    قيمة الإكس (Delta)
                  </label>
                  <input
                    type="number"
                    min={-1000}
                    max={1000}
                    required
                    value={editLogDelta}
                    onChange={(e) => setEditLogDelta(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    التاريخ الظاهر
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={editLogDateLabel}
                    onChange={(e) => setEditLogDateLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  التصنيف
                </label>
                <select
                  value={editLogCategory}
                  onChange={(e) => setEditLogCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:border-red-600 focus:outline-none"
                >
                  {!VIOLATION_CATEGORIES.includes(
                    editLogCategory as (typeof VIOLATION_CATEGORIES)[number]
                  ) && <option value={editLogCategory}>{editLogCategory}</option>}
                  {VIOLATION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  السبب / التفاصيل
                </label>
                <input
                  type="text"
                  maxLength={200}
                  required
                  value={editLogReason}
                  onChange={(e) => setEditLogReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={syncScoreOnEdit}
                  onChange={(e) => setSyncScoreOnEdit(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-600"
                />
                <span>
                  تحديث رصيد الأكسات ونسبة الخصم الحالية للموظف تلقائياً وفق فرق التعديل
                </span>
              </label>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {busyAction ? 'جاري الحفظ...' : 'حفظ التعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Only: Delete Log Confirmation Modal */}
      {deletingLog && isSuperAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف الحركة</h3>
              <button
                type="button"
                onClick={() => setDeletingLog(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                هل أنت متأكد من حذف تسجيل{' '}
                <span className="font-mono font-bold text-red-600">
                  {deletingLog.delta > 0 ? `+${deletingLog.delta} X` : `${deletingLog.delta} X`}
                </span>{' '}
                للموظف <span className="font-bold">{deletingLog.employeeName}</span> ({deletingLog.reason})؟
              </p>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncScoreOnDelete}
                  onChange={(e) => setSyncScoreOnDelete(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-600"
                />
                <span>
                  خصم / عكس قيمة هذه الحركة من رصيد الموظف الحالي وإزالتها من سجله الظاهر
                </span>
              </label>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingLog(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={() => void handleConfirmDeleteLog()}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {busyAction ? 'جاري الحذف...' : 'تأكيد الحذف'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Only: Edit Monthly Archive Modal */}
      {editingArchive && isSuperAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">تعديل الأرشيف الشهري</h3>
              <button
                type="button"
                onClick={() => setEditingArchive(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveArchiveEdit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    عنوان التقرير الشهري
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    required
                    value={editArchiveTitle}
                    onChange={(e) => setEditArchiveTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                    سجلات الموظفين في الأرشيف ({editArchiveRecords.length})
                  </div>
                  {editArchiveRecords.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      لا توجد سجلات خصم داخل هذا الأرشيف.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {editArchiveRecords.map((rec, idx) => (
                        <div
                          key={`${rec.id}_${idx}`}
                          className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{rec.name}</div>
                            <div className="text-slate-500 font-mono">كود: {rec.code || '-'}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div>
                              <label className="block text-[10px] text-slate-500">الأكسات</label>
                              <input
                                type="number"
                                min={0}
                                max={100000}
                                value={rec.excessCount}
                                onChange={(e) =>
                                  handleArchiveRecordFieldChange(
                                    idx,
                                    'excessCount',
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                className="w-20 px-2 py-1 rounded border border-slate-300 font-mono text-xs text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500">الخصم %</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={rec.discountPercentage}
                                onChange={(e) =>
                                  handleArchiveRecordFieldChange(
                                    idx,
                                    'discountPercentage',
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                className="w-20 px-2 py-1 rounded border border-slate-300 font-mono text-xs text-center"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveArchiveRow(idx)}
                              title="إزالة من الأرشيف"
                              className="mt-3 p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingArchive(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {busyAction ? 'جاري الحفظ...' : 'حفظ تعديلات الأرشيف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Only: Delete Monthly Archive Confirmation Modal */}
      {deletingArchive && isSuperAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف الأرشيف الشهري</h3>
              <button
                type="button"
                onClick={() => setDeletingArchive(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                هل أنت متأكد من حذف الأرشيف الشهري{' '}
                <span className="font-bold text-red-600">{deletingArchive.title}</span> نهائياً من
                قاعدة البيانات؟
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingArchive(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={() => void handleConfirmDeleteArchive()}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {busyAction ? 'جاري الحذف...' : 'تأكيد الحذف'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
