/**
 * Feature 13: Mobile Sidebar (hamburger menu)
 * Replace src/components/AppLayout.tsx with this
 * The mobile sidebar slides in from the left as a drawer
 */
import { useState } from 'react';
import { NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FilePlus, LogOut, Activity, Upload, Menu, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getNavItems = (role: string) => {
  const base = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/assessment', label: 'New Assessment', icon: FilePlus },
    { path: '/bulk-import', label: 'Bulk Import', icon: Upload },
    { path: '/profile', label: 'My Profile', icon: User },
  ];
  return base;
};

const NavContent = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navItems = getNavItems(user.role || '');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-cyan-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-base">MediScan AI</h1>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <RouterNavLink key={path} to={path} onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-slate-800/50'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </RouterNavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-cyan-900/20">
        {user.username && (
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-foreground">
              {user.role === 'doctor' ? 'Dr. ' : ''}{user.first_name || user.username}
            </p>
            <p className="text-xs text-slate-400 capitalize mt-0.5">{user.role} · {user.department || 'MediScan AI'}</p>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-red-400 transition-colors w-full">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
};

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen glass-card rounded-none border-r border-t-0 border-b-0 border-l-0 sticky top-0 h-screen overflow-y-auto">
        <NavContent />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 lg:hidden flex flex-col"
              style={{ background: 'rgba(6,20,40,0.98)', borderRight: '1px solid rgba(0,212,255,0.15)' }}>
              <NavContent onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-slate-800"
          style={{ background: 'rgba(2,11,24,0.95)', backdropFilter: 'blur(20px)' }}>
          <button onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-foreground transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground text-sm">MediScan AI</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
