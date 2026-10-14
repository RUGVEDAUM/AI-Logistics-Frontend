import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Package,
  Truck,
  AlertTriangle,
  Cpu,
  BarChart3,
  Settings,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  Search,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useExceptions } from '../api/hooks';
import { toast } from 'sonner';

const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Deliveries', path: '/deliveries', icon: Package },
  { name: 'Vehicles', path: '/vehicles', icon: Truck },
  { name: 'Exceptions', path: '/exceptions', icon: AlertTriangle },
  { name: 'AI Decision Center', path: '/ai-decision', icon: Cpu },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

function getSeverityBadgeClass(severity?: string) {
  const s = severity?.toLowerCase() || '';
  if (s === 'critical') return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400';
  if (s === 'high') return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400';
  if (s === 'medium') return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400';
  return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400';
}

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Exceptions data for live notifications
  const { data: exceptions = [] } = useExceptions();
  const prevExceptionIdsRef = useRef<Set<number> | null>(null);

  // Detect newly polled exceptions (not on first load)
  useEffect(() => {
    if (exceptions.length === 0) return;
    const currentIds = new Set(exceptions.map((e) => e.id));

    if (prevExceptionIdsRef.current !== null) {
      const newlyAdded = exceptions.filter((e) => !prevExceptionIdsRef.current!.has(e.id));
      if (newlyAdded.length > 0) {
        const firstNew = newlyAdded[0];
        toast.error('New exception detected', {
          description: `${firstNew.exception_type.replace(/_/g, ' ')}${
            firstNew.order_id ? ` for Order #${firstNew.order_id}` : ''
          }`,
        });
      }
    }

    prevExceptionIdsRef.current = currentIds;
  }, [exceptions]);

  // Unresolved exceptions count
  const unresolvedCount = exceptions.filter(
    (e) => e.status?.toLowerCase() !== 'resolved'
  ).length;

  // 5 latest exceptions for dropdown
  const latestExceptions = [...exceptions].reverse().slice(0, 5);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Default to LIGHT theme as requested
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return false;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen flex bg-[#f4f7fb] dark:bg-[#080d19] text-slate-800 dark:text-slate-100 font-sans">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Dark Navy Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1227] text-white flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-20 flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-tight">
                AI Logistics
              </span>
              <span className="text-[11px] text-slate-400 font-medium block leading-tight mt-0.5">
                Smart Routes. Safer Deliveries.
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Bottom: Real User Info & Logout */}
        <div className="p-4 border-t border-slate-800/80 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white block truncate leading-tight">
                  {user?.name || 'Operator'}
                </span>
                <span className="text-[11px] text-slate-400 block truncate leading-tight mt-0.5">
                  {user?.email || 'operator@logistics.com'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0 ml-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4 flex-1 max-w-lg">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, vehicles, locations..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications Bell & Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unresolvedCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unresolvedCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        Delivery Exceptions
                      </span>
                      {unresolvedCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                          {unresolvedCount} active
                        </span>
                      )}
                    </div>
                    <Link
                      to="/exceptions"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {latestExceptions.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No active exceptions
                      </div>
                    ) : (
                      latestExceptions.map((exc) => (
                        <Link
                          key={exc.id}
                          to="/exceptions"
                          onClick={() => setNotificationsOpen(false)}
                          className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors block text-left"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getSeverityBadgeClass(
                                exc.severity
                              )}`}
                            >
                              {exc.severity}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{exc.id}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-slate-900 dark:text-white capitalize">
                            {exc.exception_type.replace(/_/g, ' ')}
                            {exc.order_id != null && ` • Order #${exc.order_id}`}
                          </div>

                          {exc.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {exc.description}
                            </p>
                          )}
                        </Link>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-center">
                    <Link
                      to="/exceptions"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 block"
                    >
                      Open Exception Center
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Dark/Light Toggle */}
            <button
              onClick={() => setIsDark((prev) => !prev)}
              className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Profile badge with Logout action */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {userInitial}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block leading-tight">
                  {user?.name || 'Operator'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1 rounded-md text-slate-400 hover:text-rose-500 cursor-pointer hidden sm:block"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
