import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { RiskBadge } from '@/components/RiskBadge';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { Search, Plus, X, Eye, FilePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'sonner';

const RISK_LEVEL_COLORS: Record<string, string> = {
  Low: 'bg-risk-low', Medium: 'bg-risk-med', High: 'bg-risk-high', Critical: 'bg-risk-crit',
};

const demoPatients = [
  { id: 1, first_name: 'Sarah', last_name: 'Johnson', date_of_birth: '1985-03-15', gender: 'F', latest_risk: 'High', risk_score: 72.4, assessments_count: 5 },
  { id: 2, first_name: 'Michael', last_name: 'Chen', date_of_birth: '1990-07-22', gender: 'M', latest_risk: 'Low', risk_score: 12.1, assessments_count: 3 },
  { id: 3, first_name: 'Emily', last_name: 'Davis', date_of_birth: '1978-11-08', gender: 'F', latest_risk: 'Medium', risk_score: 45.8, assessments_count: 8 },
  { id: 4, first_name: 'James', last_name: 'Wilson', date_of_birth: '1965-01-30', gender: 'M', latest_risk: 'Critical', risk_score: 89.2, assessments_count: 12 },
  { id: 5, first_name: 'Ana', last_name: 'Martinez', date_of_birth: '1992-06-12', gender: 'F', latest_risk: 'Low', risk_score: 8.5, assessments_count: 2 },
  { id: 6, first_name: 'Robert', last_name: 'Kim', date_of_birth: '1970-09-25', gender: 'M', latest_risk: 'High', risk_score: 67.3, assessments_count: 7 },
];

const getAge = (dob: string) => {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const Patients = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', gender: 'M', blood_group: '', contact: '', email: '', address: '' });
  const navigate = useNavigate();

  const fetchPatients = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (genderFilter) params.set('gender', genderFilter);
      const { data } = await api.get(`/api/patients/?${params}`);
      setPatients(Array.isArray(data) ? data : data.results || []);
    } catch {
      setPatients(demoPatients.filter(p =>
        (!search || `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())) &&
        (!genderFilter || p.gender === genderFilter)
      ));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, [search, genderFilter]);

  const handleAddPatient = async () => {
    try {
      await api.post('/api/patients/', form);
      toast.success('Patient record created.');
      setDrawerOpen(false);
      setForm({ first_name: '', last_name: '', date_of_birth: '', gender: 'M', blood_group: '', contact: '', email: '', address: '' });
      fetchPatients();
    } catch {
      toast.error('Failed to create patient record.');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-foreground">Patient Registry</h2>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search patients..."
                className="input-underline pl-10 pr-4 py-2 w-48"
              />
            </div>
            <div className="flex gap-1">
              {['', 'M', 'F'].map(g => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-display transition-all ${
                    genderFilter === g
                      ? 'bg-cyan/20 border border-cyan text-cyan'
                      : 'border border-cyan/10 text-muted-foreground hover:border-cyan/30'
                  }`}
                >
                  {g || 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {patients.map((p, i) => {
              const initials = `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`;
              const riskColor = RISK_LEVEL_COLORS[p.latest_risk] || 'bg-muted';
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard hover className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${riskColor}/20 border border-current/20`}
                        style={{ color: p.latest_risk === 'Low' ? '#00ff88' : p.latest_risk === 'Medium' ? '#ffb800' : p.latest_risk === 'High' ? '#ff4757' : '#9d4edd' }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-foreground truncate">{p.first_name} {p.last_name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.date_of_birth ? `${getAge(p.date_of_birth)} yrs` : 'N/A'} · {p.gender === 'M' ? 'Male' : 'Female'}
                        </p>
                        <div className="mt-2">
                          <RiskBadge level={p.latest_risk || 'Low'} />
                        </div>
                        {p.risk_score !== undefined && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Risk Score</span>
                              <span className="font-mono-data text-foreground">{p.risk_score}%</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${p.risk_score}%`,
                                  background: p.risk_score < 30 ? '#00ff88' : p.risk_score < 60 ? '#ffb800' : p.risk_score < 80 ? '#ff4757' : '#9d4edd',
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{p.assessments_count || 0} assessments</p>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => navigate(`/patients/${p.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-cyan/20 text-cyan hover:bg-cyan/10 transition-all">
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button onClick={() => navigate(`/assessment?patient=${p.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border border-risk-low/20 text-risk-low hover:bg-risk-low/10 transition-all">
                            <FilePlus className="w-3 h-3" /> Assess
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full btn-cyan-gradient flex items-center justify-center shadow-lg z-40"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Drawer */}
        <AnimatePresence>
          {drawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-navy-900/70 backdrop-blur-sm"
                onClick={() => setDrawerOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md glass-card rounded-l-2xl overflow-y-auto scrollbar-custom"
              >
                <div className="p-6 border-b border-cyan/10 flex items-center justify-between">
                  <h3 className="font-display font-semibold text-foreground">Add Patient</h3>
                  <button onClick={() => setDrawerOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>
                <div className="p-6 space-y-4">
                  {(['first_name', 'last_name', 'date_of_birth', 'blood_group', 'contact', 'email', 'address'] as const).map(field => (
                    <div key={field}>
                      <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1 block">
                        {field.replace('_', ' ')}
                      </label>
                      <input
                        type={field === 'date_of_birth' ? 'date' : field === 'email' ? 'email' : 'text'}
                        value={(form as any)[field]}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        className="input-underline w-full"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Gender</label>
                    <div className="flex gap-2">
                      {['M', 'F'].map(g => (
                        <button
                          key={g}
                          onClick={() => setForm(f => ({ ...f, gender: g }))}
                          className={`px-6 py-2 rounded-full text-sm transition-all ${
                            form.gender === g
                              ? 'bg-cyan/20 border border-cyan text-cyan'
                              : 'border border-cyan/10 text-muted-foreground'
                          }`}
                        >
                          {g === 'M' ? 'Male' : 'Female'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleAddPatient} className="btn-cyan-gradient w-full mt-4">
                    Create Patient Record
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Patients;
