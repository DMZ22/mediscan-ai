import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { RiskBadge } from '@/components/RiskBadge';
import { CountUp } from '@/components/CountUp';
import { Search, ChevronRight, ChevronLeft, Check, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'sonner';
import { generateAssessmentPDF } from '@/lib/pdfReport';

const binaryFields = [
  { key: 'high_bp', label: 'High Blood Pressure', desc: 'Diagnosed with hypertension' },
  { key: 'high_chol', label: 'High Cholesterol', desc: 'Total cholesterol > 240 mg/dL' },
  { key: 'chol_check', label: 'Cholesterol Checked', desc: 'Checked in last 5 years' },
  { key: 'smoker', label: 'Smoker', desc: 'Smoked at least 100 cigarettes' },
  { key: 'stroke', label: 'Stroke History', desc: 'Previous stroke event' },
  { key: 'heart_disease', label: 'Heart Disease', desc: 'CHD or myocardial infarction' },
  { key: 'phys_activity', label: 'Physical Activity', desc: 'Exercise in past 30 days' },
  { key: 'fruits', label: 'Fruits Daily', desc: 'Consumes fruit 1+ times/day' },
  { key: 'veggies', label: 'Vegetables Daily', desc: 'Consumes vegetables 1+ times/day' },
  { key: 'heavy_alcohol', label: 'Heavy Alcohol', desc: 'Heavy drinker (M>14, F>7 drinks/wk)' },
  { key: 'any_healthcare', label: 'Has Healthcare', desc: 'Any healthcare coverage' },
  { key: 'no_doc_cost', label: 'Cost Prevented Doctor Visit', desc: 'Could not see doctor due to cost' },
  { key: 'diff_walk', label: 'Difficulty Walking', desc: 'Serious difficulty walking/climbing stairs' },
];

const ageCategories = ['18-24','25-29','30-34','35-39','40-44','45-49','50-54','55-59','60-64','65-69','70-74','75-79','80+'];
const educationLevels = ['Never attended','Elementary','Some High School','High School Grad','Some College','College Grad'];
const incomeLevels = ['< $10k','$10-15k','$15-25k','$25-35k','$35-50k','$50-75k','> $75k','> $75k+'];
const genHealthLabels = ['Excellent','Very Good','Good','Fair','Poor'];

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: '#00d4ff' };
  if (bmi < 25) return { label: 'Normal', color: '#00ff88' };
  if (bmi < 30) return { label: 'Overweight', color: '#ffb800' };
  return { label: 'Obese', color: '#ff4757' };
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

const getStatusColor = (status: string) => {
  const s = status?.toLowerCase();
  if (s === 'critical') return '#9d4edd';
  if (s === 'high') return '#ff4757';
  if (s === 'elevated') return '#ffb800';
  return '#00ff88';
};

// Reusable slider component with fixed pointer events
const Slider = ({
  label, value, min, max, onChange, display,
}: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; display: React.ReactNode;
}) => (
  <div>
    <div className="flex justify-between mb-2">
      <label className="text-xs text-slate-400 uppercase tracking-widest">{label}</label>
      <span className="text-xs font-mono">{display}</span>
    </div>
    <div style={{ position: 'relative', zIndex: 20, cursor: 'pointer' }}>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
        style={{
          position: 'relative',
          zIndex: 20,
          cursor: 'pointer',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      />
    </div>
  </div>
);

const Assessment = () => {
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patient');

  const [formData, setFormData] = useState<Record<string, number>>({
    high_bp: 0, high_chol: 0, chol_check: 0, bmi: 25, smoker: 0, stroke: 0,
    heart_disease: 0, phys_activity: 0, fruits: 0, veggies: 0, heavy_alcohol: 0,
    any_healthcare: 0, no_doc_cost: 0, gen_health: 3, ment_health: 0, phys_health: 0,
    diff_walk: 0, sex: 0, age_category: 5, education: 4, income: 4,
  });

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { navigate('/login'); return; }
    const load = async () => {
      try {
        const { data } = await api.get(`/api/patients/?search=${patientSearch}`);
        const list = Array.isArray(data) ? data : data.results || [];
        setPatients(list);
        if (preselectedPatientId && !selectedPatient) {
          const match = list.find((p: any) => String(p.id) === preselectedPatientId);
          if (match) { setSelectedPatient(match); setStep(2); }
        }
      } catch { setPatients([]); }
    };
    load();
  }, [patientSearch, navigate]);

  const handlePredict = async () => {
    if (!selectedPatient) return;
    setLoading(true);
    try {
      const payload = { patient: selectedPatient.id, ...formData };
      const { data } = await api.post('/api/patients/assessments/create/', payload);
      const processedResult = {
        ...data,
        risk_score_display: Math.round((data.risk_score || 0) * 100 * 10) / 10,
        risk_level: data.risk_level || 'low',
        risk_factors: Array.isArray(data.risk_factors) ? data.risk_factors : [],
        model_breakdown: data.model_breakdown || {},
        recommendations: data.recommendations || '',
      };
      setResult(processedResult);
      setStep(3);
      toast.success(`Risk Score: ${processedResult.risk_score_display}% — ${processedResult.risk_level.toUpperCase()}`);
    } catch {
      toast.error('Assessment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (v: number) => setFormData(f => ({ ...f, [key]: v }));

  const selectClass = "w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-cyan-400 outline-none";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground">New Assessment</h2>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border transition-all ${
                step >= s ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' : 'border-slate-700 text-slate-500'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 rounded-full transition-all ${step > s ? 'bg-cyan-400' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1 */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GlassCard className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Select Patient</h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent border-b border-slate-700 text-foreground focus:border-cyan-400 outline-none text-sm transition-colors" />
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {patients.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No patients found</p>}
                  {patients.map(p => (
                    <button key={p.id} onClick={() => setSelectedPatient(p)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                        selectedPatient?.id === p.id ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700/50 hover:border-slate-600'
                      }`}>
                      <div>
                        <span className="text-foreground font-medium">{p.first_name} {p.last_name}</span>
                        <span className="text-slate-400 text-xs ml-2">{p.age || 'N/A'} yrs</span>
                      </div>
                      {p.latest_risk_level && <RiskBadge level={p.latest_risk_level} />}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end mt-6">
                  <button onClick={() => selectedPatient && setStep(2)} disabled={!selectedPatient}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GlassCard className="p-6">
                <h3 className="font-semibold text-foreground mb-6">
                  Health Indicators for{' '}
                  <span className="text-cyan-400">{selectedPatient?.first_name} {selectedPatient?.last_name}</span>
                </h3>

                {/* Binary Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                  {binaryFields.map(f => (
                    <div key={f.key}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-700/50"
                      style={{ pointerEvents: 'auto' }}>
                      <div>
                        <p className="text-sm text-foreground">{f.label}</p>
                        <p className="text-xs text-slate-400">{f.desc}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-3">
                        {['No', 'Yes'].map((label, val) => (
                          <button key={label}
                            onClick={() => setFormData(fd => ({ ...fd, [f.key]: val }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              formData[f.key] === val
                                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-400'
                                : 'border border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sliders — wrapped in isolated containers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Slider
                    label="BMI" value={formData.bmi} min={10} max={98}
                    onChange={set('bmi')}
                    display={
                      <span style={{ color: getBMICategory(formData.bmi).color }}>
                        {formData.bmi} — {getBMICategory(formData.bmi).label}
                      </span>
                    }
                  />
                  <Slider
                    label="General Health" value={formData.gen_health} min={1} max={5}
                    onChange={set('gen_health')}
                    display={<span className="text-foreground">{genHealthLabels[formData.gen_health - 1]}</span>}
                  />
                  <Slider
                    label="Mental Health Bad Days" value={formData.ment_health} min={0} max={30}
                    onChange={set('ment_health')}
                    display={<span className="text-foreground">{formData.ment_health}/30</span>}
                  />
                  <Slider
                    label="Physical Health Bad Days" value={formData.phys_health} min={0} max={30}
                    onChange={set('phys_health')}
                    display={<span className="text-foreground">{formData.phys_health}/30</span>}
                  />
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Sex</label>
                    <select value={formData.sex} onChange={e => setFormData(f => ({ ...f, sex: Number(e.target.value) }))} className={selectClass}>
                      <option value={0}>Female</option>
                      <option value={1}>Male</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Age Category</label>
                    <select value={formData.age_category} onChange={e => setFormData(f => ({ ...f, age_category: Number(e.target.value) }))} className={selectClass}>
                      {ageCategories.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Education Level</label>
                    <select value={formData.education} onChange={e => setFormData(f => ({ ...f, education: Number(e.target.value) }))} className={selectClass}>
                      {educationLevels.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Income Level</label>
                    <select value={formData.income} onChange={e => setFormData(f => ({ ...f, income: Number(e.target.value) }))} className={selectClass}>
                      {incomeLevels.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-foreground transition-all text-sm">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handlePredict} disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm disabled:opacity-50 hover:opacity-90 transition-opacity">
                    {loading ? (
                      <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Analyzing...</>
                    ) : (
                      <>Predict Risk <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* STEP 3 — Results */}
          {step === 3 && result && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <div className="space-y-6">
                <GlassCard className="p-8 flex flex-col items-center">
                  <RiskGauge score={result.risk_score_display} level={result.risk_level} color={getRiskColor(result.risk_level)} />
                </GlassCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">Risk Factors</h3>
                    {result.risk_factors.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-8">No significant risk factors detected</p>
                    ) : (
                      <div className="space-y-3">
                        {result.risk_factors.map((f: any, i: number) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getStatusColor(f.status) }} />
                              <div>
                                <p className="text-sm text-foreground">{f.factor}</p>
                                {f.note && <p className="text-xs text-slate-400">{f.note}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-mono text-slate-400">{String(f.value)}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full border"
                                style={{ color: getStatusColor(f.status), borderColor: getStatusColor(f.status) + '40', background: getStatusColor(f.status) + '15' }}>
                                {f.status}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">Ensemble Analysis</h3>
                    {Object.keys(result.model_breakdown).length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-8">No model breakdown available</p>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(result.model_breakdown).map(([model, score]: [string, any], i) => {
                          const pct = Math.round(Number(score) * 100 * 10) / 10;
                          return (
                            <motion.div key={model} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }}>
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-slate-400 font-mono uppercase">{model}</span>
                                <span className="font-mono text-foreground">{pct}%</span>
                              </div>
                              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.15 }}
                                  className="h-full rounded-full"
                                  style={{ background: getRiskColor(result.risk_level), boxShadow: `0 0 8px ${getRiskColor(result.risk_level)}60` }} />
                              </div>
                            </motion.div>
                          );
                        })}
                        <p className="text-xs text-slate-500 mt-4 text-center">Each bar shows individual model's diabetes probability estimate</p>
                      </div>
                    )}
                  </GlassCard>
                </div>

                <GlassCard className="p-6" style={{ borderLeft: `4px solid ${getRiskColor(result.risk_level)}` }}>
                  <h3 className="font-semibold text-foreground mb-3">Clinical Recommendations</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{result.recommendations}</p>
                  <div className="mt-4 p-3 rounded-lg bg-slate-800/50 text-xs text-slate-500">
                    Model Confidence: {Math.round((result.model_confidence || 0) * 100)}% |
                    Assessment ID: #{result.id}
                  </div>
                </GlassCard>

                <div className="flex flex-wrap gap-3 justify-center">
                  <button onClick={() => navigate(`/patients/${selectedPatient?.id}`)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm hover:opacity-90 transition-opacity">
                    Save & View Patient
                  </button>
                  <button onClick={async () => {
                    try {
                      await generateAssessmentPDF(result, selectedPatient);
                      toast.success('PDF downloaded!');
                    } catch { toast.error('PDF generation failed'); }
                  }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-700 text-foreground text-sm hover:bg-slate-800 transition-colors">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button onClick={() => { setStep(1); setResult(null); setSelectedPatient(null); }}
                    className="px-6 py-3 rounded-xl border border-slate-700 text-foreground text-sm hover:bg-slate-800 transition-colors">
                    New Assessment
                  </button>
                  <button onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-slate-800 transition-colors">
                    Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

const RiskGauge = ({ score, level, color }: { score: number; level: string; color: string }) => {
  const clampedScore = Math.min(Math.max(score, 0), 100);
  const r = 85; const cx = 120; const cy = 110;
  const polarToXY = (angleDeg: number) => ({
    x: cx + r * Math.cos((angleDeg * Math.PI) / 180),
    y: cy + r * Math.sin((angleDeg * Math.PI) / 180),
  });
  const startAngle = -180;
  const fillAngle = startAngle + (clampedScore / 100) * 180;
  const describeArc = (start: number, end: number) => {
    const s = polarToXY(start); const e = polarToXY(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const needleTip = polarToXY(fillAngle);
  const levelLabel = level ? level.charAt(0).toUpperCase() + level.slice(1).toLowerCase() : '';
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 240 130" width="340" height="200">
        <path d={describeArc(-180, 0)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round" />
        <path d={describeArc(-180, -135)} fill="none" stroke="#00ff8830" strokeWidth="14" strokeLinecap="round" />
        <path d={describeArc(-135, -90)} fill="none" stroke="#ffb80030" strokeWidth="14" strokeLinecap="round" />
        <path d={describeArc(-90, -45)} fill="none" stroke="#ff475730" strokeWidth="14" strokeLinecap="round" />
        <path d={describeArc(-45, 0)} fill="none" stroke="#9d4edd30" strokeWidth="14" strokeLinecap="round" />
        <motion.path d={describeArc(startAngle, fillAngle)} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
        <motion.line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y}
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} />
        <circle cx={cx} cy={cy} r="5" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        <text x="22" y="118" fill="#4a6080" fontSize="9" textAnchor="middle">LOW</text>
        <text x="218" y="118" fill="#4a6080" fontSize="9" textAnchor="middle">CRITICAL</text>
      </svg>
      <div className="text-center -mt-4">
        <p className="text-5xl font-bold font-mono" style={{ color, textShadow: `0 0 20px ${color}80` }}>
          <CountUp end={clampedScore} decimals={1} suffix="%" duration={1500} />
        </p>
        <div className="mt-2">
          <span className="px-4 py-1.5 rounded-full text-sm font-semibold border"
            style={{ color, borderColor: color + '60', background: color + '15', boxShadow: `0 0 15px ${color}30` }}>
            {levelLabel} RISK
          </span>
        </div>
      </div>
    </div>
  );
};

export default Assessment;