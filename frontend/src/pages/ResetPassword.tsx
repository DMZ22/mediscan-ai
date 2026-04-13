/**
 * Feature 11: Password Reset Page
 * Route: /reset-password
 * Shows forgot password form OR reset form depending on ?token= param
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GlassCard } from '@/components/GlassCard';
import { DNAHelix } from '@/components/DNAHelix';
import { Loader2, Mail, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/password/reset/', { email });
      setDone(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/password/reset/confirm/', {
        token, new_password: newPassword, confirm_password: confirmPassword,
      });
      toast.success('Password reset! Please sign in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Reset failed. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-transparent border-b border-slate-700 text-foreground py-2.5 focus:border-cyan-400 outline-none text-sm transition-colors placeholder:text-slate-600";
  const labelClass = "text-xs text-slate-400 uppercase tracking-widest mb-1.5 block";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020b18, #030f1e)' }}>
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-cyan-500/20" style={{
          width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
        }} />
      ))}

      <GlassCard className="w-full max-w-md p-8 relative z-10">
        <div className="flex items-center justify-center gap-4 mb-8">
          <DNAHelix className="w-10 h-28 rotate-12" />
          <div>
            <h1 className="font-bold text-xl text-foreground">MediScan AI</h1>
            <p className="text-slate-400 text-xs tracking-widest uppercase mt-1">Password Recovery</p>
          </div>
        </div>

        {/* REQUEST RESET */}
        {!token && !done && (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div className="text-center mb-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                <Mail className="w-6 h-6 text-cyan-400" />
              </div>
              <h2 className="text-foreground font-bold text-lg">Forgot Password?</h2>
              <p className="text-slate-400 text-sm mt-1">Enter your email and we'll send a reset link</p>
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} placeholder="your@email.com" required autoFocus />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button type="button" onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </button>
          </form>
        )}

        {/* EMAIL SENT SUCCESS */}
        {!token && done && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(0,255,136,0.1)', border: '2px solid rgba(0,255,136,0.3)' }}>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-foreground font-bold text-xl">Check Your Email</h2>
            <p className="text-slate-400 text-sm">
              If <span className="text-cyan-400">{email}</span> is registered, a reset link has been sent. Check your inbox (and spam folder).
            </p>
            <div className="p-3 rounded-xl bg-slate-800/50 text-xs text-slate-500">
              Link expires in 1 hour
            </div>
            <button onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-slate-500 transition-all">
              Back to Sign In
            </button>
          </div>
        )}

        {/* CONFIRM NEW PASSWORD */}
        {token && (
          <form onSubmit={handleConfirmReset} className="space-y-5">
            <div className="text-center mb-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                <Lock className="w-6 h-6 text-cyan-400" />
              </div>
              <h2 className="text-foreground font-bold text-lg">Set New Password</h2>
              <p className="text-slate-400 text-sm mt-1">Enter and confirm your new password</p>
            </div>
            <div>
              <label className={labelClass}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className={inputClass} placeholder="Min 8 characters" required autoFocus />
              {newPassword && newPassword.length < 8 && (
                <p className="text-red-400 text-xs mt-1">At least 8 characters required</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className={inputClass} placeholder="Repeat new password" required />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </GlassCard>
    </div>
  );
};

export default ResetPassword;