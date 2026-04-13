/**
 * Feature 12: Profile Page
 * Route: /profile
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { User, Mail, Phone, Building2, Lock, Save, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'sonner';

const DEPARTMENTS = [
  'Endocrinology','Cardiology','General Medicine','Internal Medicine',
  'Neurology','Oncology','Pediatrics','Psychiatry','Surgery','Other',
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'password'>('info');

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', department: '',
  });
  const [pwForm, setPwForm] = useState({
    old_password: '', new_password: '', confirm_password: '',
  });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { navigate('/login'); return; }
    api.get('/api/auth/profile/').then(({ data }) => {
      setProfile(data);
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        department: data.department || '',
      });
    }).catch(() => toast.error('Failed to load profile')).finally(() => setLoading(false));
  }, [navigate]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/api/auth/profile/', form);
      localStorage.setItem('user', JSON.stringify(data));
      setProfile(data);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.email?.[0] || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('Passwords do not match'); return;
    }
    setPwSaving(true);
    try {
      await api.post('/api/auth/password/change/', pwForm);
      toast.success('Password changed! Please log in again.');
      localStorage.clear();
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const inputClass = "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-foreground focus:border-cyan-400 outline-none transition-colors";
  const labelClass = "text-xs text-slate-400 uppercase tracking-widest mb-1.5 block";

  if (loading) return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-800/50 animate-pulse" />)}
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Card */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black border-2 border-cyan-400/30"
              style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(37,99,235,0.15))', color: '#00d4ff' }}>
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {profile?.role === 'doctor' ? 'Dr. ' : ''}{profile?.first_name} {profile?.last_name}
              </h2>
              <p className="text-slate-400 text-sm mt-1">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-3 py-1 rounded-full border border-cyan-400/30 text-cyan-400 bg-cyan-400/10 capitalize">
                  {profile?.role}
                </span>
                {profile?.department && (
                  <span className="text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-400">
                    {profile.department}
                  </span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Tab Toggle */}
        <div className="flex gap-1 p-1 rounded-xl border border-slate-800 w-fit"
          style={{ background: 'rgba(6,20,40,0.8)' }}>
          {[
            { key: 'info', label: 'Profile Info', icon: User },
            { key: 'password', label: 'Change Password', icon: Lock },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveSection(key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSection === key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/20'
                  : 'text-slate-400 hover:text-slate-300'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Profile Info */}
        {activeSection === 'info' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" /> Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className={inputClass} placeholder="First name" />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className={inputClass} placeholder="Last name" />
                </div>
              </div>
              <div>
                <label className={labelClass}><Mail className="w-3 h-3 inline mr-1" />Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={inputClass} placeholder="Email address" />
              </div>
              <div>
                <label className={labelClass}><Phone className="w-3 h-3 inline mr-1" />Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputClass} placeholder="Contact number" />
              </div>
              {profile?.role !== 'admin' && (
                <div>
                  <label className={labelClass}><Building2 className="w-3 h-3 inline mr-1" />Department</label>
                  <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className={inputClass}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <button onClick={saveProfile} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
                {saving ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </GlassCard>
          </motion.div>
        )}

        {/* Change Password */}
        {activeSection === 'password' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" /> Change Password
              </h3>
              <div>
                <label className={labelClass}>Current Password</label>
                <input type="password" value={pwForm.old_password}
                  onChange={e => setPwForm(f => ({ ...f, old_password: e.target.value }))}
                  className={inputClass} placeholder="Enter current password" />
              </div>
              <div>
                <label className={labelClass}>New Password</label>
                <input type="password" value={pwForm.new_password}
                  onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                  className={inputClass} placeholder="Min 8 characters" />
                {pwForm.new_password && pwForm.new_password.length < 8 && (
                  <p className="text-red-400 text-xs mt-1">Password must be at least 8 characters</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input type="password" value={pwForm.confirm_password}
                  onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                  className={inputClass} placeholder="Repeat new password" />
                {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                  <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/20">
                <p className="text-amber-400 text-xs">⚠ Changing your password will log you out immediately.</p>
              </div>
              <button onClick={changePassword} disabled={pwSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #ff4757, #c0392b)' }}>
                {pwSaving ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Lock className="w-4 h-4" />}
                {pwSaving ? 'Changing...' : 'Change Password'}
              </button>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
