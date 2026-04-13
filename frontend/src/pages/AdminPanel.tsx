import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/GlassCard';
import { RiskBadge } from '@/components/RiskBadge';
import {
  Users, Activity, AlertTriangle, BarChart3,
  ToggleLeft, ToggleRight, Download, ChevronDown,
  ChevronUp, Shield, LogOut, Search, Upload, Trash2, UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'sonner';

// Confirm delete dialog
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, danger = true }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm p-6 rounded-2xl border"
        style={{ background: 'rgba(6,20,40,0.98)', borderColor: danger ? 'rgba(255,71,87,0.3)' : 'rgba(0,212,255,0.2)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: danger ? 'rgba(255,71,87,0.15)' : 'rgba(0,212,255,0.15)' }}>
          <Trash2 className="w-5 h-5" style={{ color: danger ? '#ff4757' : '#00d4ff' }} />
        </div>
        <h3 className="text-foreground font-bold text-center mb-2">{title}</h3>
        <p className="text-slate-400 text-sm text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-slate-500 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
            style={{ background: danger ? 'linear-gradient(135deg,#ff4757,#c0392b)' : 'linear-gradient(135deg,#00d4ff,#2563eb)' }}>
            Delete Permanently
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'patients' | 'assessments'>('overview');
  const [loading, setLoading] = useState(true);
  const [expandedDoctor, setExpandedDoctor] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState('');
  const [searchDoctor, setSearchDoctor] = useState('');
  const [searchPatient, setSearchPatient] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { navigate('/login'); return; }
    if (user.role !== 'admin') { navigate('/dashboard'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, d, a, p] = await Promise.all([
        api.get('/api/admin-panel/dashboard/'),
        api.get('/api/admin-panel/doctors/'),
        api.get('/api/admin-panel/assessments/'),
        api.get('/api/admin-panel/patients/'),
      ]);
      setStats(s.data);
      setDoctors(d.data.doctors || []);
      setAssessments(a.data.assessments || []);
      setPatients(p.data.patients || []);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const toggleDoctor = async (doctorId: number) => {
    try {
      const { data } = await api.post(`/api/admin-panel/doctors/${doctorId}/toggle/`);
      setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, is_active: data.is_active } : d));
      toast.success(data.message);
    } catch { toast.error('Failed to update doctor status'); }
  };

  const deleteDoctor = (doctor: any) => {
    setConfirmDialog({
      title: 'Delete Doctor Account',
      message: `Are you sure you want to permanently delete ${doctor.full_name}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/api/admin-panel/doctors/${doctor.id}/delete/`);
          setDoctors(prev => prev.filter(d => d.id !== doctor.id));
          toast.success(data.message);
        } catch (err: any) {
          toast.error(err?.response?.data?.error || 'Delete failed');
        } finally {
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const deletePatient = (patient: any) => {
    setConfirmDialog({
      title: 'Delete Patient',
      message: `Delete ${patient.full_name} and all ${patient.assessment_count} assessments? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const { data } = await api.delete(`/api/admin-panel/patients/${patient.id}/delete/`);
          setPatients(prev => prev.filter(p => p.id !== patient.id));
          toast.success(data.message);
        } catch (err: any) {
          toast.error(err?.response?.data?.error || 'Delete failed');
        } finally {
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const exportCSV = async (type: 'patients' | 'assessments') => {
    try {
      const response = await api.get(`/api/admin-panel/export/?type=${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `mediscan_${type}.csv`; a.click();
      toast.success(`${type} exported!`);
    } catch { toast.error('Export failed'); }
  };

  const filteredDoctors = doctors.filter(d =>
    !searchDoctor ||
    d.full_name?.toLowerCase().includes(searchDoctor.toLowerCase()) ||
    d.department?.toLowerCase().includes(searchDoctor.toLowerCase())
  );

  const filteredPatients = patients.filter(p =>
    !searchPatient || p.full_name?.toLowerCase().includes(searchPatient.toLowerCase())
  );

  const filteredAssessments = riskFilter
    ? assessments.filter(a => a.risk_level === riskFilter)
    : assessments;

  const statCards = stats ? [
    { label: 'Total Doctors', value: stats.doctors?.total || 0, sub: `${stats.doctors?.active || 0} active`, icon: Users, color: '#00d4ff' },
    { label: 'Total Patients', value: stats.patients?.total || 0, sub: 'In database', icon: Activity, color: '#00ff88' },
    { label: 'Total Assessments', value: stats.assessments?.total || 0, sub: `${stats.assessments?.this_week || 0} this week`, icon: BarChart3, color: '#ffb800' },
    { label: 'Critical Cases', value: stats.assessments?.critical || 0, sub: 'Requires attention', icon: AlertTriangle, color: '#ff4757' },
  ] : [];

  const TABS = ['overview', 'doctors', 'patients', 'assessments'] as const;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #020b18 0%, #030f1e 100%)' }}>
      <ConfirmDialog {...confirmDialog} open={!!confirmDialog} />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 border-b border-slate-800 px-6 py-4"
        style={{ background: 'rgba(2,11,24,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff4757, #9d4edd)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg">MediScan AI</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-red-400/30 text-red-400 bg-red-400/10">ADMIN</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm hidden md:block">
              Welcome, <span className="text-white font-medium">{user.first_name || user.username}</span>
            </span>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-400/30 transition-all text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Hospital Administration</h1>
            <p className="text-slate-400 mt-1">Manage doctors, patients and assessments</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate('/bulk-import')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-cyan-400/40 hover:text-cyan-400 transition-all">
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button onClick={() => exportCSV('patients')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-slate-500 transition-all">
              <Download className="w-4 h-4" /> Patients CSV
            </button>
            <button onClick={() => exportCSV('assessments')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-slate-500 transition-all">
              <Download className="w-4 h-4" /> Assessments CSV
            </button>
          </div>
        </div>

        {/* STAT CARDS */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-800/50 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard hover className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 uppercase tracking-widest">{card.label}</span>
                    <card.icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                  <p className="text-3xl font-bold font-mono text-foreground">{card.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-1 p-1 rounded-xl border border-slate-800 w-fit"
          style={{ background: 'rgba(6,20,40,0.8)' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-red-500/10 text-red-400 border border-red-400/20'
                  : 'text-slate-400 hover:text-slate-300'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-4">System Overview</h3>
              <div className="space-y-3">
                {[
                  { label: 'Active Doctors', value: stats?.doctors?.active || 0, color: '#00ff88' },
                  { label: 'Inactive Doctors', value: stats?.doctors?.inactive || 0, color: '#ff4757' },
                  { label: 'This Week Assessments', value: stats?.assessments?.this_week || 0, color: '#00d4ff' },
                  { label: 'This Month Assessments', value: stats?.assessments?.this_month || 0, color: '#ffb800' },
                  { label: 'Critical Risk Cases', value: stats?.assessments?.critical || 0, color: '#9d4edd' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
                    <span className="text-slate-300 text-sm">{item.label}</span>
                    <span className="font-mono font-bold text-lg" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Top Doctors by Activity</h3>
              <div className="space-y-3">
                {doctors.slice(0, 6).map((d, i) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500 w-6">#{i + 1}</span>
                      <div>
                        <p className="text-sm text-foreground">{d.full_name}</p>
                        <p className="text-xs text-slate-400">{d.department || 'N/A'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-cyan-400">{d.assessment_count} assessments</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* DOCTORS */}
        {activeTab === 'doctors' && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={searchDoctor} onChange={e => setSearchDoctor(e.target.value)}
                placeholder="Search doctors..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-foreground text-sm focus:border-cyan-400 outline-none" />
            </div>
            <div className="space-y-3">
              {filteredDoctors.map((d, i) => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <GlassCard hover className="p-4">
                    <button className="w-full flex items-center justify-between"
                      onClick={() => setExpandedDoctor(expandedDoctor === d.id ? null : d.id)}>
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold border"
                          style={{
                            color: d.is_active ? '#00ff88' : '#ff4757',
                            borderColor: d.is_active ? '#00ff8840' : '#ff475740',
                            background: d.is_active ? '#00ff8810' : '#ff475710',
                          }}>
                          {d.full_name?.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="text-foreground font-medium">{d.full_name}</p>
                          <p className="text-slate-400 text-xs capitalize">{d.role} · {d.department || 'No Dept'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-cyan-400 hidden md:block">{d.assessment_count} assessments</span>
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium hidden sm:block ${
                          d.is_active ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-red-400 border-red-400/30 bg-red-400/10'
                        }`}>{d.is_active ? 'Active' : 'Inactive'}</span>
                        <button onClick={e => { e.stopPropagation(); toggleDoctor(d.id); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                          style={{
                            color: d.is_active ? '#ff4757' : '#00ff88',
                            borderColor: d.is_active ? '#ff475740' : '#00ff8840',
                            background: d.is_active ? '#ff475710' : '#00ff8810',
                          }}>
                          {d.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          {d.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteDoctor(d); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-400/30 text-red-400 bg-red-400/5 hover:bg-red-400/15 transition-all">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        {expandedDoctor === d.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedDoctor === d.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div><span className="text-slate-400">Email</span><p className="text-foreground mt-1">{d.email || 'N/A'}</p></div>
                          <div><span className="text-slate-400">Phone</span><p className="text-foreground mt-1">{d.phone || 'N/A'}</p></div>
                          <div><span className="text-slate-400">Patients Created</span><p className="text-foreground mt-1 font-mono">{d.patient_count}</p></div>
                          <div><span className="text-slate-400">Last Activity</span>
                            <p className="text-foreground mt-1">{d.last_activity ? new Date(d.last_activity).toLocaleDateString() : 'Never'}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              ))}
              {filteredDoctors.length === 0 && <p className="text-slate-400 text-center py-12">No doctors found</p>}
            </div>
          </div>
        )}

        {/* PATIENTS */}
        {activeTab === 'patients' && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={searchPatient} onChange={e => setSearchPatient(e.target.value)}
                placeholder="Search patients..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-foreground text-sm focus:border-cyan-400 outline-none" />
            </div>
            <GlassCard className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-700/50">
                    <th className="text-left py-3 px-3">Patient</th>
                    <th className="text-left py-3 px-3 hidden md:table-cell">Age</th>
                    <th className="text-left py-3 px-3 hidden md:table-cell">Blood</th>
                    <th className="text-left py-3 px-3">Latest Risk</th>
                    <th className="text-left py-3 px-3">Assessments</th>
                    <th className="text-left py-3 px-3 hidden lg:table-cell">Added By</th>
                    <th className="text-right py-3 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p, i) => (
                    <motion.tr key={p.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-slate-700/20 hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-3">
                        <p className="text-foreground font-medium">{p.full_name}</p>
                        <p className="text-slate-400 text-xs">{p.contact || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-xs hidden md:table-cell">{p.age}</td>
                      <td className="py-3 px-3 text-slate-400 text-xs hidden md:table-cell">{p.blood_group || 'N/A'}</td>
                      <td className="py-3 px-3">
                        {p.latest_risk ? <RiskBadge level={p.latest_risk} /> : <span className="text-slate-600 text-xs">None</span>}
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-400 text-sm">{p.assessment_count}</td>
                      <td className="py-3 px-3 text-slate-400 text-xs hidden lg:table-cell">{p.created_by}</td>
                      <td className="py-3 px-3 text-right">
                        <button onClick={() => deletePatient(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-400/30 text-red-400 bg-red-400/5 hover:bg-red-400/15 transition-all ml-auto">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filteredPatients.length === 0 && <p className="text-slate-400 text-center py-12">No patients found</p>}
            </GlassCard>
          </div>
        )}

        {/* ASSESSMENTS */}
        {activeTab === 'assessments' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {['', 'low', 'medium', 'high', 'critical'].map(level => (
                <button key={level} onClick={() => setRiskFilter(level)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                    riskFilter === level ? 'bg-red-500/10 border-red-400/40 text-red-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}>
                  {level || 'All'}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-500 self-center">{filteredAssessments.length} records</span>
            </div>
            <GlassCard className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-widest border-b border-slate-700/50">
                    <th className="text-left py-3 px-3">Patient</th>
                    <th className="text-left py-3 px-3">Doctor</th>
                    <th className="text-left py-3 px-3">Risk</th>
                    <th className="text-left py-3 px-3">Score</th>
                    <th className="text-left py-3 px-3 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.map((a, i) => (
                    <motion.tr key={a.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 text-foreground font-medium">{a.patient_name}</td>
                      <td className="py-3 px-3 text-slate-400 text-xs">{a.doctor_name}</td>
                      <td className="py-3 px-3"><RiskBadge level={a.risk_level} /></td>
                      <td className="py-3 px-3 font-mono text-foreground">{a.risk_score}%</td>
                      <td className="py-3 px-3 text-slate-400 text-xs hidden md:table-cell">
                        {new Date(a.assessed_at).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filteredAssessments.length === 0 && <p className="text-slate-400 text-center py-12">No assessments found</p>}
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
