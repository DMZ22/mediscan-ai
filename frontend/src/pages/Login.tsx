import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DNAHelix } from '@/components/DNAHelix';
import { GlassCard } from '@/components/GlassCard';
import { Loader2, UserPlus, LogIn, Shield, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const DEPARTMENTS = [
  'Endocrinology','Cardiology','General Medicine','Internal Medicine',
  'Neurology','Oncology','Pediatrics','Psychiatry','Surgery','Other',
];

type Mode = 'choose' | 'login' | 'register' | 'forgot';

const Login = () => {
  const [mode, setMode] = useState<Mode>('choose');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [regData, setRegData] = useState({
    username: '', email: '', first_name: '', last_name: '',
    password: '', password2: '', role: 'doctor',
    phone: '', department: 'Endocrinology', admin_code: '',
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim()) { setLoginError('Username is required.'); return; }
    if (!password) { setLoginError('Password is required.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login/', { username, password });
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh || '');
      localStorage.setItem('user', JSON.stringify(data.user || { username }));
      toast.success('Welcome back!');
      navigate(data.user?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 400) {
        setLoginError('Incorrect username or password. Please try again.');
      } else if (status === 403) {
        setLoginError('Your account has been deactivated. Contact admin.');
      } else {
        setLoginError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegErrors({});
    const errors: Record<string, string> = {};
    if (!regData.first_name.trim()) errors.first_name = 'Required';
    if (!regData.last_name.trim()) errors.last_name = 'Required';
    if (!regData.username.trim()) errors.username = 'Required';
    if (!regData.email.trim()) errors.email = 'Required';
    if (regData.password.length < 8) errors.password = 'Min 8 characters';
    if (regData.password !== regData.password2) errors.password2 = 'Passwords do not match';
    if (regData.role === 'admin' && !regData.admin_code) errors.admin_code = 'Admin code required';
    if (Object.keys(errors).length > 0) { setRegErrors(errors); return; }

    setLoading(true);
    try {
      const payload = { ...regData };
      if (regData.role === 'admin') delete (payload as any).department;
      await api.post('/api/auth/register/', payload);
      toast.success('Account created! Please sign in.');
      setMode('login');
      setUsername(regData.username);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data) {
        const mapped: Record<string, string> = {};
        Object.entries(data).forEach(([key, val]) => {
          mapped[key] = Array.isArray(val) ? val[0] as string : String(val);
        });
        setRegErrors(mapped);
        const first = Object.values(mapped)[0];
        if (first) toast.error(first);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/password/reset/', { email: forgotEmail });
      setForgotSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reg = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setRegData(d => ({ ...d, [key]: e.target.value }));
    setRegErrors(prev => ({ ...prev, [key]: '' }));
  };

  const inputClass = "w-full bg-transparent border-b border-slate-700 text-foreground py-2.5 focus:border-cyan-400 outline-none text-sm transition-colors placeholder:text-slate-600";
  const labelClass = "text-xs text-slate-400 uppercase tracking-widest mb-1.5 block";
  const selectClass = "w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-cyan-400 outline-none";
  const FieldError = ({ field }: { field: string }) =>
    regErrors[field] ? <p className="text-red-400 text-xs mt-1">{regErrors[field]}</p> : null;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-cyan-500/20" style={{
          width: Math.random() * 4 + 1, height: Math.random() * 4 + 1,
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }} />
      ))}
      <div className="scan-line" />

      <GlassCard className="w-full max-w-[460px] p-8 relative z-10">
        <div className="flex items-center justify-center gap-4 mb-8">
          <DNAHelix className="w-12 h-32 rotate-12" />
          <div>
            <h1 className="font-bold text-2xl text-foreground">MediScan AI</h1>
            <p className="text-slate-400 text-xs tracking-[0.3em] uppercase mt-1">Clinical Intelligence Platform</p>
          </div>
        </div>

        {/* ── CHOOSE ── */}
        {mode === 'choose' && (
          <div className="space-y-3">
            <p className="text-center text-slate-400 text-sm mb-5">How would you like to continue?</p>

            <button onClick={() => setMode('register')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-700 hover:border-cyan-400/40 transition-all group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                <UserPlus className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="text-foreground font-semibold text-sm group-hover:text-cyan-400 transition-colors">Register as Doctor or Admin</p>
                <p className="text-slate-500 text-xs mt-0.5">Create a new clinical account</p>
              </div>
            </button>

            <button onClick={() => setMode('login')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-700 hover:border-green-400/40 transition-all group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)' }}>
                <LogIn className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-left">
                <p className="text-foreground font-semibold text-sm group-hover:text-green-400 transition-colors">Sign In</p>
                <p className="text-slate-500 text-xs mt-0.5">Access your clinical dashboard</p>
              </div>
            </button>

            <button onClick={() => setMode('login')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-red-900/30 hover:border-red-400/40 transition-all group"
              style={{ background: 'rgba(255,71,87,0.03)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}>
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-left">
                <p className="text-foreground font-semibold text-sm group-hover:text-red-400 transition-colors">Admin Login</p>
                <p className="text-slate-500 text-xs mt-0.5">Hospital administration panel</p>
              </div>
            </button>
          </div>
        )}

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <button type="button" onClick={() => { setMode('choose'); setLoginError(''); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all text-sm font-medium mb-2">
              ← Back to Options
            </button>
            <div>
              <label className={labelClass}>Username</label>
              <input type="text" value={username}
                onChange={e => { setUsername(e.target.value); setLoginError(''); }}
                className={inputClass} placeholder="Enter your username" required autoFocus />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input type="password" value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(''); }}
                className={inputClass} placeholder="Enter your password" required />
            </div>

            {/* Inline error — stays on login screen */}
            {loginError && (
              <div className="flex items-start gap-2 p-3 rounded-xl border border-red-400/20 bg-red-400/5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{loginError}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button type="button" onClick={() => { setMode('forgot'); setLoginError(''); }}
              className="w-full text-center text-xs text-slate-500 hover:text-cyan-400 transition-colors py-1">
              Forgot password?
            </button>
          </form>
        )}

        {/* ── REGISTER ── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <button type="button" onClick={() => { setMode('choose'); setRegErrors({}); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all text-sm font-medium">
              ← Back to Options
            </button>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name</label>
                <input type="text" value={regData.first_name} onChange={reg('first_name')}
                  className={`${inputClass} ${regErrors.first_name ? 'border-red-400' : ''}`} placeholder="First" />
                <FieldError field="first_name" />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input type="text" value={regData.last_name} onChange={reg('last_name')}
                  className={`${inputClass} ${regErrors.last_name ? 'border-red-400' : ''}`} placeholder="Last" />
                <FieldError field="last_name" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Username</label>
              <input type="text" value={regData.username} onChange={reg('username')}
                className={`${inputClass} ${regErrors.username ? 'border-red-400' : ''}`} placeholder="Choose a username" />
              <FieldError field="username" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={regData.email} onChange={reg('email')}
                className={`${inputClass} ${regErrors.email ? 'border-red-400' : ''}`} placeholder="doctor@hospital.com" />
              <FieldError field="email" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="text" value={regData.phone} onChange={reg('phone')}
                className={inputClass} placeholder="Contact number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Role</label>
                <select value={regData.role} onChange={reg('role')} className={selectClass}>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className={regData.role === 'admin' ? 'opacity-30 pointer-events-none' : ''}>
                <label className={labelClass}>Department {regData.role === 'admin' && <span className="text-slate-600">(N/A)</span>}</label>
                <select value={regData.department} onChange={reg('department')}
                  disabled={regData.role === 'admin'} className={selectClass}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            {regData.role === 'admin' && (
              <div className="p-4 rounded-xl border border-red-400/20 bg-red-400/5">
                <label className="text-xs text-red-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Admin Access Code
                </label>
                <input type="password" value={regData.admin_code} onChange={reg('admin_code')}
                  className="w-full bg-transparent border-b border-red-400/30 text-foreground py-2 focus:border-red-400 outline-none text-sm font-mono placeholder:text-slate-600"
                  placeholder="Enter secret admin code" />
                <FieldError field="admin_code" />
                <p className="text-xs text-slate-600 mt-2">Contact hospital IT administration for access code</p>
              </div>
            )}
            <div>
              <label className={labelClass}>Password</label>
              <input type="password" value={regData.password} onChange={reg('password')}
                className={`${inputClass} ${regErrors.password ? 'border-red-400' : ''}`} placeholder="Min 8 characters" />
              <FieldError field="password" />
            </div>
            <div>
              <label className={labelClass}>Confirm Password</label>
              <input type="password" value={regData.password2} onChange={reg('password2')}
                className={`${inputClass} ${regErrors.password2 ? 'border-red-400' : ''}`} placeholder="Repeat password" />
              <FieldError field="password2" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && (
          <div className="space-y-5">
            <button type="button" onClick={() => { setMode('login'); setForgotSent(false); setForgotEmail(''); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all text-sm font-medium">
              ← Back to Sign In
            </button>
            {!forgotSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-foreground font-bold text-lg">Forgot Password?</h2>
                  <p className="text-slate-400 text-sm mt-1">Enter your registered email address</p>
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    className={inputClass} placeholder="your@email.com" required autoFocus />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(0,255,136,0.1)', border: '2px solid rgba(0,255,136,0.3)' }}>
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-foreground font-bold text-xl">Check Your Email</h2>
                <p className="text-slate-400 text-sm">
                  If <span className="text-cyan-400">{forgotEmail}</span> is registered, a reset link has been sent.
                </p>
                <p className="text-slate-600 text-xs">Link expires in 1 hour · Check spam folder too</p>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Login;