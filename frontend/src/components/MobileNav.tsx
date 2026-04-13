import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Users, FilePlus, BarChart3, LogOut, Activity } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/assessment', label: 'New Assessment', icon: FilePlus },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(true)} className="p-2 text-foreground">
        <Menu className="w-6 h-6" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-900/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 glass-card rounded-none animate-slide-in-right border-r border-cyan/15">
            <div className="p-4 flex justify-between items-center border-b border-cyan/10">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan" />
                <span className="font-display font-bold">MediScan AI</span>
              </div>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <button
                  key={path}
                  onClick={() => { navigate(path); setOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 w-full"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyan/10">
              <button
                onClick={() => { localStorage.clear(); navigate('/login'); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-risk-high w-full"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
