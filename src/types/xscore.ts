export const SUPER_ADMIN_EMAIL = 'minakhairat1@gmail.com';

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
}

export interface AdminRecord {
  id: string; // adminKey
  email: string;
  displayName: string;
  role: 'assistant_admin' | 'supervisor';
  canAssignEmployees: boolean;
  active: boolean;
  assignedCount: number;
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

export type AdminSessionRole = 'super_admin' | 'assistant_admin' | 'supervisor' | 'none';

export interface AdminSession {
  role: AdminSessionRole;
  adminKey: string | null;
  displayName: string;
  email: string;
  canAssignEmployees: boolean;
  active: boolean;
  assignedEmployeeIds: string[];
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
