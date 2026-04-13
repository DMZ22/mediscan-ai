import { NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FilePlus, LogOut, Activity, Upload, User, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const getNavItems = (role: string) => {
  const base = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/assessment', label: 'New Assessment', icon: FilePlus },
    { path: '/bulk-import', label: 'Bulk Import', icon: Upload },
    { path: '/profile', label: 'My Profile', icon: User },
  ];
  if (role === 'admin') base.push({ path: '/admin', label: 'Admin Panel', icon: Shield });
  return base;
};

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navItems = getNavItems(user.role || '');

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen glass-card rounded-none border-r border-t-0 border-b-0 border-l-0">
      <div className="p-6 border-b border-cyan/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg">MediScan AI</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          const isAdmin = path === '/admin';
          return (
            <RouterNavLink key={path} to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? isAdmin
                    ? 'bg-red-500/10 text-red-400 border border-red-400/20'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </RouterNavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-cyan/10 space-y-2">
        {user.username && (
          <div className="px-4 mb-3">
            <p className="text-sm font-medium text-foreground">
              {user.role === 'doctor' ? 'Dr. ' : ''}{user.first_name || user.username}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">{user.role}</p>
          </div>
        )}
        <ThemeToggle />
        <button onClick={() => { localStorage.clear(); navigate('/login'); }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-red-400 transition-colors w-full">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );
};
