export const SUPER_ADMIN_EMAIL = 'minakhairat1@gmail.com';
export const SUPER_ADMIN_EMAILS = ['minakhairat1@gmail.com', 'minakhairat96@gmail.com'] as const;

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (SUPER_ADMIN_EMAILS as readonly string[]).includes(normalized);
}

export const DEFAULT_EXCESS_ALERT_THRESHOLD = 15;
export const EXCESS_THRESHOLD_OPTIONS = [10, 15, 20, 25, 30] as const;

export const DEFAULT_DEPARTMENTS: string[] = [
  'عام',
  'خط المبرد الصحراوي',
  'خط الميكروويف',
  'الجودة',
  'التعبئة والتغليف',
  'المخازن',
  'الصيانة'
];

export interface DepartmentItem {
  id: string;
  name: string;
}

export interface XScoreLogEntry {
  id: string;
  delta: number;
  reason: string;
  category: string;
  dateLabel: string;
  recordedByName: string;
  createdAtIso: string;
}

export interface Employee {
  id: string;
  serial: number;
  code: string;
  name: string;
  department: string;
  excessCount: number;
  discountPercentage: number;
  recentLogs: XScoreLogEntry[];
  assignedAdminKeys: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StatsSummary {
  totalEmployees: number;
  avgDiscount: number;
  totalExcess: number;
  employeesWithExcess: number;
  seedInitialized: boolean;
  cycleLabel: string;
  updatedAt?: unknown;
}

export interface DirectoryEmployeeItem {
  id: string;
  serial: number;
  code: string;
  name: string;
  department: string;
  excessCount: number;
  discountPercentage: number;
}

export interface AdminAssignmentDirectoryItem {
  id: string; // adminKey
  displayName: string;
  role: 'assistant_admin' | 'supervisor';
  canAssignEmployees: boolean;
  active: boolean;
  assignedEmployeeIds: string[];
  assignedDepartments?: string[];
}

export interface AdminRecord {
  id: string; // adminKey
  email: string;
  displayName: string;
  role: 'assistant_admin' | 'supervisor';
  canAssignEmployees: boolean;
  active: boolean;
  assignedCount: number;
  assignedDepartments?: string[];
  createdByEmail: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface XScoreAuditLog {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  delta: number;
  previousExcess: number;
  newExcess: number;
  previousDiscount: number;
  newDiscount: number;
  reason: string;
  category: string;
  dateLabel: string;
  recordedByUid: string;
  recordedByName: string;
  recordedByRole: string;
  createdAt?: unknown;
}

export interface MonthlyArchiveRecord {
  id: string;
  title: string;
  totalEmployees: number;
  penalizedEmployees: number;
  totalExcess: number;
  avgDiscount: number;
  records: {
    id: string;
    code: string;
    name: string;
    excessCount: number;
    discountPercentage: number;
  }[];
  closedByUid: string;
  closedByName: string;
  createdAt?: unknown;
}

export interface ExcelEmployeeImportRow {
  serial?: number;
  code: string;
  name: string;
  department: string;
  excessCount: number;
  discountPercentage: number;
}

export interface FullAppBackupPayload {
  schemaVersion: 'xscore-backup-v1';
  exportedAt: string;
  cycleLabel: string;
  stats: StatsSummary | null;
  departments: DepartmentItem[];
  employees: Employee[];
  admins: Array<AdminRecord & { assignedEmployeeIds: string[]; assignedDepartments?: string[] }>;
  xscoreLogs: XScoreAuditLog[];
  monthlyArchives: MonthlyArchiveRecord[];
}

export type AdminSessionRole = 'super_admin' | 'assistant_admin' | 'supervisor' | 'none';

export interface AdminSession {
  role: AdminSessionRole;
  adminKey: string | null;
  displayName: string;
  email: string;
  canAssignEmployees: boolean;
  active: boolean;
  assignedEmployeeIds: string[];
  assignedDepartments: string[];
}

export const VIOLATION_CATEGORIES = [
  'التزام ومواعيد',
  'جودة الإنتاج',
  'السلامة المهنية',
  'سلوك وانضباط',
  'مخالفة تشغيلية',
  'تعديل إداري'
] as const;

export const QUICK_X_PRESETS = [
  { label: '+1 X (ملاحظة بسيطة)', delta: 1 },
  { label: '+5 X (مخالفة متوسطة)', delta: 5 },
  { label: '+10 X (مخالفة مؤثرة)', delta: 10 },
  { label: '+25 X (مخالفة جسيمة)', delta: 25 },
  { label: '-5 X (رفع / تخفيض إداري)', delta: -5 }
] as const;

export function calculateDiscountFromExcess(excessCount: number): number {
  const clamped = Math.max(0, Math.min(100, Math.round(excessCount)));
  return clamped;
}

export function getIncentiveStanding(discountPercentage: number): {
  label: string;
  detail: string;
  tone: 'clean' | 'warning' | 'danger';
} {
  if (discountPercentage <= 0) {
    return {
      label: 'مؤهل للحافز الكامل',
      detail: 'سجل نظيف بدون أي خصومات (100% من الحافز)',
      tone: 'clean'
    };
  }
  if (discountPercentage < 20) {
    return {
      label: `خصم ${discountPercentage}% من الحافز`,
      detail: `صافي الاستحقاق الشهري ${100 - discountPercentage}%`,
      tone: 'warning'
    };
  }
  return {
    label: `خصم مرتفع (${discountPercentage}%)`,
    detail: `صافي الاستحقاق الشهري ${Math.max(0, 100 - discountPercentage)}% — يتطلب مراجعة`,
    tone: 'danger'
  };
}

export interface MonthThresholdAnalysis {
  threshold: number;
  effectiveMonthExcess: number;
  last30DaysAdded: number;
  last30DaysLogsCount: number;
  crossed: boolean;
  nearThreshold: boolean;
  severity: 'normal' | 'warning' | 'critical';
  overBy: number;
  progressPct: number;
}

export function getLastMonthExcessAnalysis(
  employee: Pick<Employee, 'excessCount' | 'recentLogs'>,
  threshold: number = DEFAULT_EXCESS_ALERT_THRESHOLD
): MonthThresholdAnalysis {
  const safeThreshold = Math.max(1, Math.round(threshold));
  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let last30DaysAdded = 0;
  let last30DaysLogsCount = 0;

  for (const log of employee.recentLogs || []) {
    const parsedTime = Date.parse(log.createdAtIso || '');
    const isWithinLastMonth = Number.isFinite(parsedTime) ? parsedTime >= thirtyDaysAgoMs : false;
    if (isWithinLastMonth) {
      last30DaysLogsCount += 1;
      if (Number(log.delta) > 0) {
        last30DaysAdded += Number(log.delta);
      }
    }
  }

  const currentExcess = Number(employee.excessCount) || 0;
  const effectiveMonthExcess = Math.max(currentExcess, last30DaysAdded);
  const crossed = effectiveMonthExcess >= safeThreshold;
  const nearThreshold = !crossed && effectiveMonthExcess >= Math.ceil(safeThreshold * 0.7);
  const overBy = Math.max(0, effectiveMonthExcess - safeThreshold);
  const progressPct = Math.min(100, Math.round((effectiveMonthExcess / safeThreshold) * 100));

  let severity: 'normal' | 'warning' | 'critical' = 'normal';
  if (effectiveMonthExcess >= safeThreshold + 10 || effectiveMonthExcess >= 25) {
    severity = crossed ? 'critical' : 'normal';
  } else if (crossed) {
    severity = 'warning';
  }

  return {
    threshold: safeThreshold,
    effectiveMonthExcess,
    last30DaysAdded,
    last30DaysLogsCount,
    crossed,
    nearThreshold,
    severity,
    overBy,
    progressPct
  };
}
