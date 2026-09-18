'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Palette,
  Monitor,
  Printer,
  FileText,
  Settings,
  Building2,
  LogOut,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Sun,
  Moon,
  Info,
  X
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import type { KioskDevice, PrintJobRecord } from '@/lib/data/enterpriseStore';

type HeaderNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  timestamp: string;
  severity: 'warning' | 'error' | 'info';
};

function formatNotificationTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const minutesAgo = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutesAgo < 1) return 'Just now';
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  if (minutesAgo < 1440) return `${Math.floor(minutesAgo / 60)}h ago`;
  return `${Math.floor(minutesAgo / 1440)}d ago`;
}

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const { isDark, toggleTheme } = useTheme();
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(null);
  const [showDevModal, setShowDevModal] = useState(false);

  // If on login page, DO NOT render the sidebar, top navigation, or any protected UI
  const isLoginPage = pathname === '/hr/login';

  useEffect(() => {
    if (isLoginPage) return;

    const loadAdminProfile = () => {
      fetch('/api/auth/profile')
        .then((response) => response.json())
        .then((json) => {
          if (json.data) {
            setAdminUser({ email: json.data.email, name: json.data.displayName });
          }
        })
        .catch(() => { });
    };

    loadAdminProfile();
    window.addEventListener('hr-profile-updated', loadAdminProfile);
    return () => window.removeEventListener('hr-profile-updated', loadAdminProfile);
  }, [isLoginPage]);

  const [kiosksCount, setKiosksCount] = useState<number | null>(null);
  const [onlineKiosksCount, setOnlineKiosksCount] = useState<number>(0);
  const [kiosks, setKiosks] = useState<KioskDevice[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJobRecord[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsError, setNotificationsError] = useState(false);

  const [auditDispatches, setAuditDispatches] = useState<any[]>([]);

  // Fetch real KIOSK fleet count, print jobs, and support dispatch audit logs
  useEffect(() => {
    if (isLoginPage) return;

    fetch('/api/kiosks', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Kiosks API request failed.');
        return r.json();
      })
      .then((kioskJson) => {
        const loadedKiosks = kioskJson.data ?? [];
        setKiosks(loadedKiosks);
        setKiosksCount(kioskJson.total ?? loadedKiosks.length);
        setOnlineKiosksCount(kioskJson.onlineCount ?? loadedKiosks.filter((kiosk: KioskDevice) => kiosk.status === 'ONLINE').length);
      })
      .catch(() => {
        setKiosksCount(0);
        setOnlineKiosksCount(0);
        setNotificationsError(true);
      });

    fetch('/api/print-jobs', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Print jobs API request failed.');
        return r.json();
      })
      .then((printJobJson) => setPrintJobs(printJobJson.data ?? []))
      .catch(() => setNotificationsError(true));

    fetch('/api/audit-logs', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) {
          const supportRequests = json.data.filter(
            (log: any) => log.action === 'HR_ASSISTANCE_REQUESTED' || (log.actorType === 'KIOSK' && log.details?.includes('HR ASSISTANCE'))
          );
          setAuditDispatches(supportRequests);
        }
      })
      .catch(() => { });

    fetch('/api/branches')
      .then((r) => r.json())
      .then((json) => {
        setBranches(json.data ?? []);
      })
      .catch(() => { });

    // Poll support dispatches every 8 seconds for real-time alerts
    const pollInterval = setInterval(() => {
      fetch('/api/audit-logs', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.data) {
            const supportRequests = json.data.filter(
              (log: any) => log.action === 'HR_ASSISTANCE_REQUESTED' || (log.actorType === 'KIOSK' && log.details?.includes('HR ASSISTANCE'))
            );
            setAuditDispatches(supportRequests);
          }
        })
        .catch(() => { });
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [isLoginPage]);

  const notifications: HeaderNotification[] = [
    ...auditDispatches.map((log: any) => ({
      id: `audit-${log.id}`,
      title: `🚨 ${log.actor || 'KIOSK'} Dispatch Report`,
      description: `${log.branchName ? `${log.branchName} • ` : ''}${log.details || 'Assistance requested'}`,
      href: '/hr/audit-logs',
      timestamp: log.timestamp,
      severity: 'error' as const,
    })),
    ...kiosks
      .filter((kiosk) => kiosk.status !== 'ONLINE')
      .map((kiosk) => ({
        id: `kiosk-${kiosk.id}`,
        title: `${kiosk.code} is ${kiosk.status.toLowerCase()}`,
        description: kiosk.name,
        href: '/hr/kiosks',
        timestamp: kiosk.lastHeartbeat,
        severity: kiosk.status === 'DISABLED' ? 'error' as const : 'warning' as const,
      })),
    ...printJobs
      .filter((job) => ['FAILED', 'QUEUED', 'PRINTING'].includes(job.status))
      .map((job) => ({
        id: `print-job-${job.id}`,
        title: `Print job ${job.status.toLowerCase()}`,
        description: `${job.jobNumber} - ${job.employeeName}`,
        href: '/hr/print-history',
        timestamp: job.createdAt,
        severity: job.status === 'FAILED' ? 'error' as const : 'info' as const,
      })),
  ].sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());

  const visibleNotifications = notifications.slice(0, 5);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
    } catch {
      // Continue to the login screen even if the network is unavailable.
    }
    document.cookie = 'hr_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.replace('/hr/login');
    router.refresh();
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: 'Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
    { name: 'Employees', href: '/hr/employees', icon: Users },
    { name: 'Card Designs', href: '/hr/card-designs', icon: Palette },
    { name: 'KIOSKs', href: '/hr/kiosks', icon: Monitor },
    { name: 'Print History', href: '/hr/print-history', icon: Printer },
    { name: 'Audit Logs', href: '/hr/audit-logs', icon: FileText },
    { name: 'Settings', href: '/hr/settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-[#0b0f17] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Left Sidebar */}
      <aside className="w-64 sticky top-0 h-screen border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0e1424]/90 backdrop-blur-md flex flex-col justify-between shrink-0 shadow-sm z-30 transition-colors duration-300">
        <div>
          {/* Logo Header */}
          <div className="h-16 px-6 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white shadow-md shadow-red-600/30">
              ID
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">ID Card System</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Enterprise HR Suite</div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/hr/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Info */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs mb-3 shadow-xs">
            <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold">KIOSK Fleet Status</div>
            <div className="flex items-center justify-between mt-1 text-slate-900 dark:text-white font-medium">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${onlineKiosksCount > 0
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                />
                {kiosksCount === null
                  ? 'Connecting...'
                  : `${onlineKiosksCount} Active KIOSK${onlineKiosksCount === 1 ? '' : 's'}`}
              </span>
              <span className={onlineKiosksCount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 font-medium'}>
                {kiosksCount && kiosksCount > 0
                  ? `${Math.round((onlineKiosksCount / kiosksCount) * 100)}% Sync`
                  : 'None'}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40 transition text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0f172a]/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors duration-300">
          <div className="flex items-center gap-4">
            {/* Branch Selector */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500"
              >
                <option value="ALL">All Branches (Global)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* User & Mode Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Toggle Light/Dark Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
                title={notifications.length ? `${notifications.length} notification${notifications.length === 1 ? '' : 's'}` : 'No new notifications'}
                aria-label="Open notifications"
                aria-expanded={isNotificationsOpen}
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold absolute -top-1 -right-1 flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-11 w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h2>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Live kiosk and print activity</p>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {notifications.length} open
                    </span>
                  </div>

                  {notificationsError ? (
                    <div className="px-4 py-6 text-center text-xs text-rose-600 dark:text-rose-400">
                      Notifications are temporarily unavailable.
                    </div>
                  ) : visibleNotifications.length === 0 ? (
                    <div className="px-4 py-7 text-center">
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">All systems are nominal</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">No kiosk or print issues need attention.</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {visibleNotifications.map((notification) => {
                        const Icon = notification.severity === 'error'
                          ? XCircle
                          : notification.severity === 'warning'
                            ? AlertTriangle
                            : Clock;
                        const iconClass = notification.severity === 'error'
                          ? 'text-rose-500'
                          : notification.severity === 'warning'
                            ? 'text-amber-500'
                            : 'text-sky-500';

                        return (
                          <Link
                            key={notification.id}
                            href={notification.href}
                            onClick={() => setIsNotificationsOpen(false)}
                            className="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                          >
                            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{notification.title}</span>
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">{notification.description}</span>
                              <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1">{formatNotificationTime(notification.timestamp)}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
                    <Link
                      href="/hr/audit-logs"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-[10px] font-semibold text-red-600 dark:text-red-400 hover:underline"
                    >
                      View audit logs
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-600/20 border border-red-200 dark:border-red-500/40 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400">
                HR
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">{adminUser?.name || 'Admin HR'}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{adminUser?.email || 'admin@magiccard.corp'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Body View */}
        <main className="p-6 flex-1 overflow-y-auto bg-slate-50/70 dark:bg-[#0b0f17] transition-colors duration-300">
          {children}
        </main>
      </div>

      {/* Bottom Right Floating System & Architecture Info Badge & Modal */}
      <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-2 pointer-events-auto">
        {showDevModal && (
          <div className="w-72 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-2xl space-y-2.5 text-slate-900 dark:text-white transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 text-white flex items-center justify-center font-extrabold text-[10px] shadow-sm shrink-0">
                  WG
                </div>
                <div>
                  <h4 className="text-[11px] font-bold leading-tight text-slate-900 dark:text-white">System Architecture & Specs</h4>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium block">Full-Stack Software Engineer & Lead Architect: Wilbert Gamis</span>
                </div>
              </div>
              <button
                onClick={() => setShowDevModal(false)}
                className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Close modal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Built 100% End-to-End from Scratch
              </p>
              <p>
                Architected and developed this entire enterprise system single-handedly — Next.js 15 frontend, Supabase backend APIs, custom 2D/3D WebGL engine, C# kiosk agent hardware service, desktop installers, PM2 daemons, and VBS auto-launch scripts.
              </p>
            </div>

            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1 text-[8px] font-mono font-bold">
              <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800">
                Next.js 15
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Supabase
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                3D WebGL Engine
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                C# Kiosk Agent
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                PM2 Daemon
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Windows VBS Launcher
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowDevModal(!showDevModal)}
          title="System Architecture & Developer Info"
          className="p-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center justify-center bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-500"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
