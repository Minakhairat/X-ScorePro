import { LogIn, LogOut } from 'lucide-react';
import { type AdminSession } from '../types/xscore';

export type AppTab = 'lookup' | 'policy' | 'admin' | 'admins_rbac' | 'logs';

interface TopBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  session: AdminSession;
  isAuthenticated: boolean;
  authBusy: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function TopBar({
  activeTab,
  onSelectTab,
  session,
  isAuthenticated,
  authBusy,
  onSignIn,
  onSignOut
}: TopBarProps) {
  const isAuthorizedAdmin = session.role !== 'none' && session.active;
  const canManageAdmins = session.role === 'super_admin';

  const navItems: { id: AppTab; label: string; visible: boolean }[] = [
    { id: 'lookup', label: 'الاستعلام السريع', visible: true },
    { id: 'policy', label: 'نظام الحوافز', visible: true },
    { id: 'admin', label: 'لوحة تسجيل الإكسات', visible: isAuthorizedAdmin },
    { id: 'admins_rbac', label: 'إدارة المشرفين', visible: canManageAdmins },
    { id: 'logs', label: 'السجل والأرشيف', visible: isAuthorizedAdmin }
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('lookup')}
          className="flex items-center gap-2.5 text-slate-900 hover:text-red-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 text-white font-mono font-bold text-base">
            X
          </span>
          <span className="font-display font-extrabold text-xl tracking-tight">X-Score</span>
        </button>

        {/* Zone 2: Clean single-line text nav links */}
        <nav className="hidden md:flex items-center gap-6 overflow-x-auto">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded ${
                    isActive
                      ? 'text-red-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-red-600 rounded-full" />
                  )}
                </button>
              );
            })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authBusy}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <LogIn className="w-4 h-4" />
              <span>{authBusy ? 'جاري الدخول...' : 'دخول الإدارة'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              disabled={authBusy}
              title={session.email}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-semibold hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <LogOut className="w-4 h-4 text-red-600" />
              <span className="max-w-[140px] truncate">{session.displayName || 'خروج'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="md:hidden border-t border-slate-100 px-3 py-1.5 flex items-center gap-4 overflow-x-auto bg-white">
        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-red-600 border-red-600'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
      </div>
    </header>
  );
}
