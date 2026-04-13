import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { motion } from 'framer-motion';
import { FileText, Upload, FlaskConical, Loader2, AlertCircle, CheckCircle, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  normal: 'text-green-400', low: 'text-blue-400', high: 'text-orange-400',
  critical_low: 'text-red-400', critical_high: 'text-red-400', unknown: 'text-gray-400',
};

const STATUS_ICONS: Record<string, any> = {
  normal: CheckCircle, low: ArrowDown, high: ArrowUp,
  critical_low: AlertCircle, critical_high: AlertCircle, unknown: Minus,
};

const Reports = () => {
  const [panels, setPanels] = useState<any[]>([]);
  const [selectedPanel, setSelectedPanel] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [sex, setSex] = useState('male');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/api/reports/panels/').then(r => setPanels(r.data.panels)).catch(() => {});
  }, []);

  const currentFields = panels.find(p => p.key === selectedPanel)?.fields || [];

  const handleAnalyze = async () => {
    if (!selectedPanel) return toast.error('Select a panel type');
    const numericValues: Record<string, number> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v) numericValues[k] = parseFloat(v);
    }
    if (Object.keys(numericValues).length === 0) return toast.error('Enter at least one value');

    setLoading(true);
    try {
      const { data } = await api.post('/api/reports/analyze/', { panel_type: selectedPanel, values: numericValues, sex });
      setResult(data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/api/reports/upload/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(data);
      toast.success('Report analyzed successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const renderValueTable = (flaggedValues: Record<string, any>) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs uppercase tracking-widest border-b border-cyan-900/30">
            <th className="text-left py-2 px-2">Test</th>
            <th className="text-left py-2 px-2">Value</th>
            <th className="text-left py-2 px-2">Reference</th>
            <th className="text-left py-2 px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(flaggedValues).map(([key, v]: [string, any]) => {
            const StatusIcon = STATUS_ICONS[v.status] || Minus;
            return (
              <tr key={key} className="border-b border-cyan-900/20">
                <td className="py-2 px-2 text-foreground">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                <td className="py-2 px-2 font-mono text-foreground">{v.value} {v.unit}</td>
                <td className="py-2 px-2 text-muted-foreground font-mono">{v.reference_low} - {v.reference_high}</td>
                <td className="py-2 px-2">
                  <span className={`flex items-center gap-1 ${STATUS_COLORS[v.status] || 'text-gray-400'}`}>
                    <StatusIcon className="w-3 h-3" />
                    {v.status?.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Lab Report Analyzer</h2>
          <p className="text-muted-foreground text-sm">AI-powered lab test interpretation with reference ranges</p>
        </div>

        <Tabs defaultValue="manual" className="space-y-4">
          <TabsList className="bg-background/50 border border-cyan-900/30">
            <TabsTrigger value="manual"><FlaskConical className="w-4 h-4 mr-1" /> Manual Entry</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-1" /> Upload Report</TabsTrigger>
          </TabsList>

          {/* Manual Entry */}
          <TabsContent value="manual" className="space-y-4">
            <GlassCard className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Test Panel</label>
                  <Select value={selectedPanel} onValueChange={v => { setSelectedPanel(v); setValues({}); setResult(null); }}>
                    <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select panel..." /></SelectTrigger>
                    <SelectContent>{panels.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Sex (for reference ranges)</label>
                  <Select value={sex} onValueChange={setSex}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {currentFields.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {currentFields.map((f: any) => (
                    <div key={f.key} className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground w-40 shrink-0">{f.label} <span className="text-xs">({f.unit})</span></label>
                      <Input type="number" step="any" value={values[f.key] || ''} onChange={e => setValues(p => ({ ...p, [f.key]: e.target.value }))}
                        className="bg-background/50" placeholder={f.unit} />
                    </div>
                  ))}
                </div>
              )}

              {selectedPanel && (
                <Button className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700" onClick={handleAnalyze} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Analyze Values'}
                </Button>
              )}
            </GlassCard>

            {/* Manual Results */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {result.flagged_values && (
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" /> Results
                    </h3>
                    {renderValueTable(result.flagged_values)}
                  </GlassCard>
                )}
                {result.ai_interpretation && (
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-3">AI Interpretation</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{result.ai_interpretation.summary}</p>
                    {result.ai_interpretation.concerns?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-amber-400 mb-1">Concerns:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {result.ai_interpretation.concerns.map((c: string, i: number) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.ai_interpretation.recommendations && (
                      <div>
                        <p className="text-sm font-medium text-cyan-400 mb-1">Recommendations:</p>
                        <p className="text-sm text-muted-foreground">{result.ai_interpretation.recommendations}</p>
                      </div>
                    )}
                  </GlassCard>
                )}
                <div className="text-center text-xs text-muted-foreground p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
                  AI-generated interpretation. Must be reviewed by a healthcare professional.
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* Upload */}
          <TabsContent value="upload" className="space-y-4">
            <GlassCard className="p-6">
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-cyan-900/30 rounded-xl p-12 text-center cursor-pointer hover:border-cyan-500/40 transition-colors">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium">Click to upload lab report</p>
                <p className="text-muted-foreground text-sm mt-1">PDF, JPG, or PNG — AI will extract & analyze values</p>
              </div>
              {loading && (
                <div className="flex items-center justify-center gap-2 mt-4 text-cyan-400">
                  <Loader2 className="w-5 h-5 animate-spin" /> Extracting values from report...
                </div>
              )}
            </GlassCard>

            {/* Upload Results */}
            {uploadResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {uploadResult.extraction?.values && Object.keys(uploadResult.extraction.values).length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-2">Extracted Values</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Panel: {uploadResult.extraction.panel_type} · Confidence: {uploadResult.extraction.extraction_confidence}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground text-xs uppercase border-b border-cyan-900/30">
                            <th className="text-left py-2 px-2">Test</th>
                            <th className="text-left py-2 px-2">Value</th>
                            <th className="text-left py-2 px-2">Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(uploadResult.extraction.values).map(([k, v]: [string, any]) => (
                            <tr key={k} className="border-b border-cyan-900/20">
                              <td className="py-2 px-2 text-foreground">{k}</td>
                              <td className="py-2 px-2 font-mono">{v.value} {v.unit}</td>
                              <td className="py-2 px-2 text-muted-foreground">{v.reference_range}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                )}
                {uploadResult.ai_interpretation && (
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-3">AI Interpretation</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{uploadResult.ai_interpretation.summary}</p>
                  </GlassCard>
                )}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
