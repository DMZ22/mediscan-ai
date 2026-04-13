import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { CountUp } from '@/components/CountUp';
import { RiskBadge } from '@/components/RiskBadge';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { Users, Activity, AlertTriangle, Brain } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, AreaChart, Area, ResponsiveContainer
} from 'recharts';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const RISK_COLORS: Record<string, string> = {
  Low: '#00ff88', Medium: '#ffb800', High: '#ff4757', Critical: '#9d4edd',
  low: '#00ff88', medium: '#ffb800', high: '#ff4757', critical: '#9d4edd',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(6,20,40,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '8px 12px' }}>
      {label && <p style={{ color: '#e2e8f0', marginBottom: 4, fontSize: 12 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill, fontSize: 12, fontFamily: 'monospace' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

const statIcons = [
  { icon: Users, color: 'text-cyan-400' },
  { icon: Activity, color: 'text-green-400' },
  { icon: AlertTriangle, color: 'text-red-400' },
  { icon: Brain, color: 'text-purple-400' },
];

const Dashboard = () => {
  const [summary, setSummary] = useState<any>(null);
  const [riskDist, setRiskDist] = useState<any[]>([]);
  const [ageGroups, setAgeGroups] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      navigate('/login');
      return;
    }
    const load = async () => {
      try {
        const [s, r, a, t, rc] = await Promise.all([
          api.get('/api/analytics/summary/'),
          api.get('/api/analytics/risk-distribution/'),
          api.get('/api/analytics/age-groups/'),
          api.get('/api/analytics/trends/?months=6'),
          api.get('/api/analytics/recent/'),
        ]);

        // Summary
        const totals = s.data?.totals || {};
        const averages = s.data?.averages || {};
        setSummary({
          total_patients: totals.patients ?? 0,
          today_assessments: totals.today_assessments ?? 0,
          high_risk: totals.high_risk_patients ?? 0,
          avg_risk: averages.risk_score ?? 0,
        });

        // Risk distribution — API returns { data: [{level, count}], total }
        const rdRaw = Array.isArray(r.data?.data) ? r.data.data : [];
        setRiskDist(rdRaw.map((d: any) => ({
          name: d.level ? d.level.charAt(0).toUpperCase() + d.level.slice(1) : d.name,
          value: d.count ?? d.value ?? 0,
        })));

        // Age groups — API returns { age_groups: [{group, low, medium, high, critical}] }
        const agRaw = Array.isArray(a.data?.age_groups) ? a.data.age_groups : [];
        setAgeGroups(agRaw.map((g: any) => ({
          group: g.group,
          Low: g.low ?? 0,
          Medium: g.medium ?? 0,
          High: g.high ?? 0,
          Critical: g.critical ?? 0,
        })));

        // Trends — API returns { monthly_data: [{month, total_assessments, high_risk_count, avg_risk_score}] }
        const tRaw = Array.isArray(t.data?.monthly_data) ? t.data.monthly_data : [];
        setTrends(tRaw.map((m: any) => ({
          month: m.month,
          assessments: m.total_assessments ?? 0,
          highRisk: m.high_risk_count ?? 0,
          avgScore: m.avg_risk_score ?? 0,
        })));

        // Recent — API returns { recent_assessments: [...] }
        const recentRaw = Array.isArray(rc.data?.recent_assessments) ? rc.data.recent_assessments : [];
        setRecent(recentRaw.map((item: any) => ({
          id: item.patient_id ?? item.id,
          patient: item.patient_name ?? 'Unknown',
          risk_level: item.risk_level ? item.risk_level.charAt(0).toUpperCase() + item.risk_level.slice(1) : 'Low',
          risk_score: item.risk_score ?? 0,
          bmi: item.bmi ?? '-',
          assessed_by: item.assessed_by ?? '',
          time: item.assessed_at ? new Date(item.assessed_at).toLocaleString() : '',
        })));

      } catch (err) {
        toast.error('Failed to load dashboard data. Showing demo data.');
        // Fallback demo data
        setSummary({ total_patients: 12, today_assessments: 3, high_risk: 4, avg_risk: 52.3 });
        setRiskDist([
          { name: 'Low', value: 3 }, { name: 'Medium', value: 4 },
          { name: 'High', value: 3 }, { name: 'Critical', value: 2 },
        ]);
        setAgeGroups([
          { group: '18-30', Low: 2, Medium: 1, High: 0, Critical: 0 },
          { group: '31-45', Low: 1, Medium: 2, High: 1, Critical: 0 },
          { group: '46-60', Low: 0, Medium: 1, High: 2, Critical: 1 },
          { group: '60+', Low: 0, Medium: 0, High: 1, Critical: 2 },
        ]);
        setTrends([
          { month: 'Jan 2026', assessments: 5, highRisk: 2, avgScore: 48 },
          { month: 'Feb 2026', assessments: 8, highRisk: 3, avgScore: 51 },
          { month: 'Mar 2026', assessments: 12, highRisk: 4, avgScore: 52 },
        ]);
        setRecent([
          { id: 1, patient: 'Arjun Sharma', risk_level: 'High', risk_score: 72.4, bmi: 31.2, assessed_by: 'Dr. Ramesh Gupta', time: '2 min ago' },
          { id: 2, patient: 'Priya Patel', risk_level: 'Low', risk_score: 12.1, bmi: 23.4, assessed_by: 'Dr. Ramesh Gupta', time: '15 min ago' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = summary ? [
    { label: 'Total Patients', value: summary.total_patients, suffix: '' },
    { label: "Today's Assessments", value: summary.today_assessments, suffix: '' },
    { label: 'High Risk Patients', value: summary.high_risk, suffix: '' },
    { label: 'Avg Risk Score', value: summary.avg_risk, suffix: '%', decimals: 1 },
  ] : [];

  const totalPie = riskDist.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Greeting */}
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            {greeting()},{' '}
            <span className="text-cyan-400">
              Dr. {user.first_name || user.username || 'Physician'}
            </span>
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, i) => {
              const { icon: Icon, color } = statIcons[i];
              return (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <GlassCard hover className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground uppercase tracking-widest">{card.label}</span>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <p className="text-3xl font-bold font-mono text-foreground">
                      <CountUp end={card.value} decimals={card.decimals || 0} suffix={card.suffix} />
                    </p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Charts Row */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton /><ChartSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut */}
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Risk Distribution</h3>
              {riskDist.length === 0 ? (
                <p className="text-muted-foreground text-center py-16">No data yet</p>
              ) : (
                <>
                  <div className="flex justify-center">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={riskDist}
                          cx="50%" cy="50%"
                          innerRadius={70} outerRadius={100}
                          paddingAngle={4} dataKey="value" stroke="none"
                        >
                          {riskDist.map((entry) => (
                            <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#64748b'} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2 flex-wrap">
                    {riskDist.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ background: RISK_COLORS[d.name] }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-mono text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </GlassCard>

            {/* Age Group Bar */}
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Risk by Age Group</h3>
              {ageGroups.length === 0 ? (
                <p className="text-muted-foreground text-center py-16">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ageGroups} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                    <XAxis dataKey="group" tick={{ fill: '#4a6080', fontSize: 12 }} axisLine={false} />
                    <YAxis tick={{ fill: '#4a6080', fontSize: 12 }} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Low" stackId="a" fill="#00ff88" />
                    <Bar dataKey="Medium" stackId="a" fill="#ffb800" />
                    <Bar dataKey="High" stackId="a" fill="#ff4757" />
                    <Bar dataKey="Critical" stackId="a" fill="#9d4edd" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </div>
        )}

        {/* Monthly Trend */}
        {loading ? <ChartSkeleton /> : (
          <GlassCard className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Monthly Trends</h3>
            {trends.length === 0 ? (
              <p className="text-muted-foreground text-center py-16">No data yet — assessments will appear here after the first month</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trends} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4757" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff4757" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="assessments" stroke="#00d4ff" fill="url(#gradCyan)" strokeWidth={2} name="Assessments" />
                  <Area type="monotone" dataKey="highRisk" stroke="#ff4757" fill="url(#gradRed)" strokeWidth={2} name="High Risk" />
                  <Area type="monotone" dataKey="avgScore" stroke="#9d4edd" fill="none" strokeWidth={2} strokeDasharray="5 5" name="Avg Score %" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        )}

        {/* Recent Activity */}
        {loading ? <TableSkeleton /> : (
          <GlassCard className="p-6 overflow-x-auto">
            <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
            {recent.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent assessments</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs uppercase tracking-widest border-b border-cyan-900/30">
                    <th className="text-left py-3 px-2">Patient</th>
                    <th className="text-left py-3 px-2">Risk Level</th>
                    <th className="text-left py-3 px-2">Score</th>
                    <th className="text-left py-3 px-2 hidden md:table-cell">BMI</th>
                    <th className="text-left py-3 px-2 hidden lg:table-cell">Assessed By</th>
                    <th className="text-left py-3 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r: any, i: number) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-cyan-900/20 hover:bg-cyan-900/10 transition-colors cursor-pointer"
                      onClick={() => r.id && navigate(`/patients/${r.id}`)}
                    >
                      <td className="py-3 px-2 text-foreground">{r.patient}</td>
                      <td className="py-3 px-2"><RiskBadge level={r.risk_level} /></td>
                      <td className="py-3 px-2 font-mono">{r.risk_score}%</td>
                      <td className="py-3 px-2 font-mono hidden md:table-cell">{r.bmi}</td>
                      <td className="py-3 px-2 hidden lg:table-cell text-muted-foreground">{r.assessed_by}</td>
                      <td className="py-3 px-2 text-muted-foreground">{r.time}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassCard>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;