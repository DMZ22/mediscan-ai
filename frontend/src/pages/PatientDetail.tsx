import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { RiskBadge } from '@/components/RiskBadge';
import { CardSkeleton, ChartSkeleton } from '@/components/LoadingSkeleton';
import { FilePlus, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import api from '@/lib/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(6,20,40,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: '#e2e8f0', marginBottom: 4, fontSize: 12 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 12, fontFamily: 'monospace' }}>{p.name}: {p.value}%</p>
      ))}
    </div>
  );
};

const getAge = (dob: string) => {
  if (!dob) return 'N/A';
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return isNaN(age) ? 'N/A' : `${age} years`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

const getRiskColor = (level: string) => {
  const map: Record<string, string> = {
    low: '#00ff88', Low: '#00ff88',
    medium: '#ffb800', Medium: '#ffb800',
    high: '#ff4757', High: '#ff4757',
    critical: '#9d4edd', Critical: '#9d4edd',
  };
  return map[level] || '#00d4ff';
};

const genHealthLabel = (val: number) => {
  const labels = ['', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];
  return labels[val] || `${val}/5`;
};

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      navigate('/login');
      return;
    }
    const load = async () => {
      try {
        const { data } = await api.get(`/api/patients/${id}/`);
        setPatient(data);
      } catch (err) {
        console.error('Failed to load patient:', err);
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  if (loading) return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <CardSkeleton /><ChartSkeleton />
      </div>
    </AppLayout>
  );

  if (!patient) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-400 text-lg mb-4">Patient not found</p>
        <button
          onClick={() => navigate('/patients')}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm"
        >
          Back to Patients
        </button>
      </div>
    </AppLayout>
  );

  const assessments = patient.assessments || [];

  // API returns risk_score as 0-1, convert to 0-100 for display
  const trendData = assessments
    .slice()
    .reverse()
    .map((a: any) => ({
      date: formatDateShort(a.assessed_at),
      score: Math.round((a.risk_score || 0) * 100 * 10) / 10,
    }));

  const latestRisk = patient.latest_risk_level || assessments[0]?.risk_level || 'low';
  const riskColor = getRiskColor(latestRisk);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Header Card */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-2"
                style={{ color: riskColor, borderColor: riskColor, background: `${riskColor}15` }}
              >
                {patient.first_name?.[0]}{patient.last_name?.[0]}
              </div>
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ border: `2px solid ${riskColor}` }}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">
                {patient.first_name} {patient.last_name}
              </h2>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-400">
                <span>{getAge(patient.date_of_birth)}</span>
                <span>{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</span>
                {patient.blood_group && <span>Blood: {patient.blood_group}</span>}
                {patient.contact && <span>{patient.contact}</span>}
              </div>
              <div className="mt-3">
                <RiskBadge level={latestRisk} />
              </div>
            </div>
            <button
              onClick={() => navigate(`/assessment?patient=${patient.id}`)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <FilePlus className="w-4 h-4" /> New Assessment
            </button>
          </div>
        </GlassCard>

        {/* Risk Score Trend Chart */}
        {trendData.length > 1 && (
          <GlassCard className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Risk Score Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#4a6080', fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: '#4a6080', fontSize: 12 }} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="score" stroke={riskColor}
                  strokeWidth={2} dot={{ fill: riskColor, r: 4 }} name="Risk Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        )}

        {/* Assessment Timeline */}
        <div>
          <h3 className="font-semibold text-foreground mb-4">
            Assessment History
            <span className="ml-2 text-xs text-slate-500 font-normal">({assessments.length} total)</span>
          </h3>

          {assessments.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-slate-400 mb-4">No assessments yet</p>
              <button
                onClick={() => navigate(`/assessment?patient=${patient.id}`)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm"
              >
                Start First Assessment
              </button>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {[...assessments].reverse().map((a: any, i: number) => {
                // Convert 0-1 risk_score to percentage
                const riskPct = Math.round((a.risk_score || 0) * 100 * 10) / 10;
                // Convert 0-1 model_confidence to percentage
                const confidencePct = Math.round((a.model_confidence || 0) * 100);
                const aRiskColor = getRiskColor(a.risk_level);

                return (
                  <motion.div
                    key={a.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <GlassCard hover className="p-4">
                      <button
                        onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-xs text-slate-400 font-mono w-28 text-left">
                            {formatDate(a.assessed_at)}
                          </span>
                          <RiskBadge level={a.risk_level} />
                          <span
                            className="font-mono text-sm font-semibold"
                            style={{ color: aRiskColor }}
                          >
                            {riskPct}%
                          </span>
                        </div>
                        {expandedId === a.id
                          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        }
                      </button>

                      {expandedId === a.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-4 pt-4 border-t border-cyan-900/30 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs"
                        >
                          <div>
                            <span className="text-slate-400">BMI</span>
                            <p className="font-mono text-foreground mt-1">
                              {a.bmi ? Number(a.bmi).toFixed(1) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Blood Pressure</span>
                            <p className="font-mono text-foreground mt-1">
                              {a.high_bp === 1 || a.high_bp === true ? 'High' : 'Normal'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">General Health</span>
                            <p className="font-mono text-foreground mt-1">
                              {a.gen_health ? genHealthLabel(a.gen_health) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Confidence</span>
                            <p className="font-mono text-foreground mt-1">
                              {confidencePct > 0 ? `${confidencePct}%` : 'N/A'}
                            </p>
                          </div>
                          {a.recommendations && (
                            <div className="col-span-2 md:col-span-4 mt-2 p-3 rounded-lg bg-slate-800/50">
                              <span className="text-slate-400">Recommendation</span>
                              <p className="text-slate-300 mt-1 leading-relaxed">{a.recommendations}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default PatientDetail;