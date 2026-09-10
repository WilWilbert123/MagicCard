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
  Search,
  Building2,
  LogOut,
  Bell,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const { isDark, toggleTheme } = useTheme();
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(null);

  // If on login page, DO NOT render the sidebar, top navigation, or any protected UI
  const isLoginPage = pathname === '/hr/login';

  useEffect(() => {
    if (isLoginPage) return;

    // Read cookie/session to display user profile
    const match = document.cookie.match(new RegExp('(^| )hr_auth_token=([^;]+)'));
    if (match && match[2]) {
      try {
        const decoded = JSON.parse(atob(match[2].replace(/-/g, '+').replace(/_/g, '/')));
        setAdminUser({
          email: decoded.email || 'admin@magiccard.corp',
          name: decoded.name || 'Admin HR',
        });
      } catch {
        setAdminUser({ email: 'admin@magiccard.corp', name: 'Admin HR' });
      }
    }
  }, [isLoginPage]);

  const [kiosksCount, setKiosksCount] = useState<number | null>(null);
  const [onlineKiosksCount, setOnlineKiosksCount] = useState<number>(0);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch real KIOSK fleet count and branches from Supabase
  useEffect(() => {
    if (isLoginPage) return;

    fetch('/api/kiosks')
      .then((r) => r.json())
      .then((json) => {
        setKiosksCount(json.total ?? 0);
        setOnlineKiosksCount(json.onlineCount ?? 0);
      })
      .catch(() => {
        setKiosksCount(0);
        setOnlineKiosksCount(0);
      });

    fetch('/api/branches')
      .then((r) => r.json())
      .then((json) => {
        setBranches(json.data ?? []);
      })
      .catch(() => {});
  }, [isLoginPage]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    // Clear client-side cookie directly as backup
    document.cookie = 'hr_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.replace('/hr/login');
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
      <aside className="w-64 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0e1424]/90 backdrop-blur-md flex flex-col justify-between shrink-0 shadow-sm z-30 transition-colors duration-300">
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
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
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
                  className={`w-2 h-2 rounded-full ${
                    onlineKiosksCount > 0
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
          <div className="flex items-center gap-4 flex-1 max-w-lg">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employees, KIOSKs, templates..."
                className="w-full bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:bg-white transition"
              />
            </div>

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

            <button className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1.5" />
            </button>

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
    </div>
  );
}
