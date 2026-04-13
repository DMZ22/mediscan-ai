import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { RiskBadge } from '@/components/RiskBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Brain, Droplets, Wind, Thermometer, Activity, Scan, ArrowLeft, ArrowRight, Search, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';

const DISEASE_ICONS: Record<string, any> = {
  diabetes: Activity, heart_disease: Heart, stroke: Brain,
  kidney_disease: Droplets, liver_disease: Scan, lung_disease: Wind, thyroid: Thermometer,
};

const DISEASE_COLORS: Record<string, string> = {
  diabetes: 'text-cyan-400', heart_disease: 'text-red-400', stroke: 'text-purple-400',
  kidney_disease: 'text-blue-400', liver_disease: 'text-amber-400', lung_disease: 'text-green-400', thyroid: 'text-orange-400',
};

const Screening = () => {
  const [step, setStep] = useState(0);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [selectedDisease, setSelectedDisease] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/screening/diseases/').then(r => setDiseases(r.data.diseases)).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => {
        api.get(`/api/patients/?search=${search}`).then(r => {
          setPatients(r.data.results || r.data || []);
        }).catch(() => {});
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search, step]);

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedDisease) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/screening/create/', {
        patient: selectedPatient.id,
        disease_type: selectedDisease.key,
        indicators: formData,
      });
      setResult(data);
      setStep(4);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Screening failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    const colors: Record<string, string> = { low: '#00ff88', medium: '#ffb800', high: '#ff4757', critical: '#9d4edd' };
    return colors[level?.toLowerCase()] || '#64748b';
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Health Screening</h2>
            <p className="text-muted-foreground text-sm">AI-powered multi-disease risk assessment</p>
          </div>
          {step > 0 && step < 4 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
        </div>

        {/* Progress */}
        {step < 4 && (
          <div className="flex gap-2">
            {['Disease', 'Details', 'Patient', 'Indicators'].map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-cyan-500' : 'bg-cyan-900/30'}`} />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 0: Choose Disease */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {diseases.map(d => {
                  const Icon = DISEASE_ICONS[d.key] || Activity;
                  return (
                    <GlassCard key={d.key} hover className="p-6 cursor-pointer" onClick={() => { setSelectedDisease(d); setStep(d.key === 'diabetes' ? 2 : 1); setFormData({}); }}>
                      <Icon className={`w-8 h-8 mb-3 ${DISEASE_COLORS[d.key] || 'text-cyan-400'}`} />
                      <h3 className="font-semibold text-foreground mb-1">{d.label}</h3>
                      <p className="text-muted-foreground text-xs">{d.description}</p>
                      {d.ai_powered && <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">AI Powered</span>}
                      {!d.ai_powered && <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">ML Model</span>}
                    </GlassCard>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 1: Disease-specific form (AI diseases only) */}
          {step === 1 && selectedDisease?.fields && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GlassCard className="p-6">
                <h3 className="font-semibold text-foreground mb-4">{selectedDisease.label} — Health Indicators</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDisease.fields.map((f: any) => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-sm text-muted-foreground">{f.label}</label>
                      {f.type === 'toggle' && (
                        <div className="flex items-center gap-2">
                          <Switch checked={!!formData[f.key]} onCheckedChange={v => setFormData(p => ({ ...p, [f.key]: v }))} />
                          <span className="text-xs text-foreground">{formData[f.key] ? 'Yes' : 'No'}</span>
                        </div>
                      )}
                      {f.type === 'number' && (
                        <Input type="number" min={f.min} max={f.max} value={formData[f.key] || ''} onChange={e => setFormData(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))} className="bg-background/50" />
                      )}
                      {f.type === 'select' && (
                        <Select value={formData[f.key] || ''} onValueChange={v => setFormData(p => ({ ...p, [f.key]: v }))}>
                          <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{f.options.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
                <Button className="mt-6 w-full bg-cyan-600 hover:bg-cyan-700" onClick={() => setStep(2)}>
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 2: Select Patient */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GlassCard className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Select Patient</h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-background/50" />
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {patients.map((p: any) => (
                    <div key={p.id} onClick={() => { setSelectedPatient(p); if (selectedDisease?.key === 'diabetes') setStep(3); else setStep(3); }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedPatient?.id === p.id ? 'bg-cyan-500/20 border border-cyan-500/40' : 'hover:bg-cyan-900/20 border border-transparent'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-foreground font-medium">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-muted-foreground">{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'} · {p.contact}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {patients.length === 0 && <p className="text-muted-foreground text-center py-8">No patients found</p>}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 3: Confirm & Submit */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GlassCard className="p-6 text-center">
                <h3 className="font-semibold text-foreground mb-4">Ready to Screen</h3>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">Disease: <span className="text-foreground font-medium">{selectedDisease?.label}</span></p>
                  <p className="text-muted-foreground">Patient: <span className="text-foreground font-medium">{selectedPatient?.first_name} {selectedPatient?.last_name}</span></p>
                  {Object.keys(formData).length > 0 && (
                    <p className="text-muted-foreground">{Object.keys(formData).length} indicators provided</p>
                  )}
                </div>
                <Button className="mt-6 w-full bg-cyan-600 hover:bg-cyan-700" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Run AI Screening'}
                </Button>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 4: Results */}
          {step === 4 && result && (
            <motion.div key="s4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Risk Score */}
              <GlassCard className="p-6 text-center">
                <h3 className="font-semibold text-foreground mb-2">{selectedDisease?.label} Risk Assessment</h3>
                <p className="text-muted-foreground text-sm mb-6">Patient: {selectedPatient?.first_name} {selectedPatient?.last_name}</p>
                <div className="relative w-48 h-48 mx-auto mb-4">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="12" />
                    <circle cx="100" cy="100" r="85" fill="none" stroke={getRiskColor(result.risk_level)} strokeWidth="12"
                      strokeDasharray={`${(result.risk_score / 100) * 534} 534`} strokeLinecap="round"
                      transform="rotate(-90 100 100)" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold font-mono" style={{ color: getRiskColor(result.risk_level) }}>
                      {Math.round(result.risk_score)}%
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{result.risk_level} risk</span>
                  </div>
                </div>
              </GlassCard>

              {/* Risk Factors */}
              {result.risk_factors?.length > 0 && (
                <GlassCard className="p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Risk Factors
                  </h3>
                  <div className="space-y-3">
                    {result.risk_factors.map((f: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/30">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${f.status === 'critical' ? 'bg-red-500' : f.status === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                        <div>
                          <p className="text-foreground text-sm font-medium">{f.factor}: <span className="text-muted-foreground">{f.value}</span></p>
                          <p className="text-xs text-muted-foreground">{f.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* AI Analysis */}
              {result.ai_analysis && (
                <GlassCard className="p-6">
                  <h3 className="font-semibold text-foreground mb-3">AI Analysis</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{result.ai_analysis}</p>
                </GlassCard>
              )}

              {/* Recommendations */}
              {result.recommendations && (
                <GlassCard className="p-6">
                  <h3 className="font-semibold text-foreground mb-3">Recommendations</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{result.recommendations}</p>
                </GlassCard>
              )}

              {/* Disclaimer */}
              <div className="text-center text-xs text-muted-foreground p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
                {result.disclaimer || 'This is an AI-powered screening tool. Results should be reviewed by a qualified healthcare professional.'}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setStep(0); setResult(null); setFormData({}); setSelectedPatient(null); }}>
                  New Screening
                </Button>
                <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700" onClick={() => navigate(`/patients/${selectedPatient?.id}`)}>
                  View Patient
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Screening;
