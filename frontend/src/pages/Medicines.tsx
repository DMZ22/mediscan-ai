import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { motion } from 'framer-motion';
import { Pill, Search, Loader2, AlertTriangle, ShieldAlert, Plus, X, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-green-500/20 text-green-300 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  severe: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  contraindicated: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const Medicines = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [drugDetail, setDrugDetail] = useState<any>(null);
  const [drugList, setDrugList] = useState<string[]>(['']);
  const [interactions, setInteractions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setLoading(true);
    setDrugDetail(null);
    try {
      const { data } = await api.get(`/api/medicines/search/?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.results || []);
      if (data.results?.length === 0) toast.info('No drugs found');
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDrugDetail = async (name: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/api/medicines/${encodeURIComponent(name)}/`);
      setDrugDetail(data);
    } catch {
      toast.error('Failed to load drug details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInteractionCheck = async () => {
    const drugs = drugList.filter(d => d.trim());
    if (drugs.length < 2) return toast.error('Enter at least 2 medications');
    setLoading(true);
    try {
      const { data } = await api.post('/api/medicines/interactions/', { drugs });
      setInteractions(data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Interaction check failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Medicine Analyzer</h2>
          <p className="text-muted-foreground text-sm">Drug information & interaction checker powered by OpenFDA + AI</p>
        </div>

        <Tabs defaultValue="search" className="space-y-4">
          <TabsList className="bg-background/50 border border-cyan-900/30">
            <TabsTrigger value="search"><Search className="w-4 h-4 mr-1" /> Drug Search</TabsTrigger>
            <TabsTrigger value="interactions"><ShieldAlert className="w-4 h-4 mr-1" /> Interaction Checker</TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <GlassCard className="p-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search medicine name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-10 bg-background/50" />
                </div>
                <Button onClick={handleSearch} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </GlassCard>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((drug, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <GlassCard hover className="p-4 cursor-pointer" onClick={() => handleDrugDetail(drug.generic_name)}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Pill className="w-4 h-4 text-cyan-400" />
                            <h4 className="font-semibold text-foreground">{drug.brand_name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Generic: {drug.generic_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">Manufacturer: {drug.manufacturer} · Route: {drug.route}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Drug Detail */}
            {detailLoading && (
              <div className="flex items-center justify-center py-12 text-cyan-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading drug details...
              </div>
            )}
            {drugDetail?.ai_analysis && !detailLoading && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <GlassCard className="p-6">
                  <h3 className="font-semibold text-foreground text-lg mb-1">{drugDetail.ai_analysis.generic_name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {drugDetail.ai_analysis.brand_names?.join(', ')} · {drugDetail.ai_analysis.drug_class}
                  </p>

                  <div className="space-y-4">
                    {drugDetail.ai_analysis.uses?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-cyan-400 mb-1">Uses</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {drugDetail.ai_analysis.uses.map((u: string, i: number) => <li key={i}>{u}</li>)}
                        </ul>
                      </div>
                    )}
                    {drugDetail.ai_analysis.dosage && (
                      <div>
                        <h4 className="text-sm font-medium text-cyan-400 mb-1">Dosage</h4>
                        <p className="text-sm text-muted-foreground">{drugDetail.ai_analysis.dosage}</p>
                      </div>
                    )}
                    {drugDetail.ai_analysis.side_effects && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <h4 className="text-sm font-medium text-yellow-400 mb-1">Common Side Effects</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {(drugDetail.ai_analysis.side_effects.common || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-red-400 mb-1">Serious Side Effects</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {(drugDetail.ai_analysis.side_effects.serious || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                    {drugDetail.ai_analysis.contraindications?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-red-400 mb-1">Contraindications</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {drugDetail.ai_analysis.contraindications.map((c: string, i: number) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </GlassCard>

                {drugDetail.adverse_events?.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-3">Reported Adverse Events (FDA)</h3>
                    <div className="flex flex-wrap gap-2">
                      {drugDetail.adverse_events.map((e: any, i: number) => (
                        <span key={i} className="px-2 py-1 text-xs rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                          {e.reaction} ({e.count})
                        </span>
                      ))}
                    </div>
                  </GlassCard>
                )}

                <div className="text-center text-xs text-muted-foreground p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
                  {drugDetail.ai_analysis.disclaimer || 'Consult your doctor or pharmacist for personalized medical advice.'}
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* Interactions Tab */}
          <TabsContent value="interactions" className="space-y-4">
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Enter Medications</h3>
              <div className="space-y-2">
                {drugList.map((drug, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder={`Medication ${i + 1}`} value={drug} onChange={e => {
                      const updated = [...drugList]; updated[i] = e.target.value; setDrugList(updated);
                    }} className="bg-background/50" />
                    {drugList.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setDrugList(drugList.filter((_, j) => j !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                {drugList.length < 10 && (
                  <Button variant="outline" size="sm" onClick={() => setDrugList([...drugList, ''])}>
                    <Plus className="w-3 h-3 mr-1" /> Add Drug
                  </Button>
                )}
              </div>
              <Button className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700" onClick={handleInteractionCheck} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : 'Check Interactions'}
              </Button>
            </GlassCard>

            {/* Interaction Results */}
            {interactions && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Interaction Results</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${interactions.overall_risk === 'high' ? 'bg-red-500/20 text-red-300' : interactions.overall_risk === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                      {interactions.overall_risk} risk
                    </span>
                  </div>

                  {interactions.interactions?.length > 0 ? (
                    <div className="space-y-3">
                      {interactions.interactions.map((inter: any, i: number) => (
                        <div key={i} className={`p-3 rounded-lg border ${SEVERITY_COLORS[inter.severity] || ''}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-medium text-sm">{inter.drug_pair?.join(' + ')}</span>
                            <span className="text-xs uppercase tracking-wider ml-auto">{inter.severity}</span>
                          </div>
                          <p className="text-xs opacity-80">{inter.description}</p>
                          <p className="text-xs mt-1 opacity-60">{inter.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-400 text-sm">No significant interactions found between these medications.</p>
                  )}

                  {interactions.recommendations && (
                    <p className="text-sm text-muted-foreground mt-4 p-3 bg-cyan-500/5 rounded-lg">{interactions.recommendations}</p>
                  )}
                </GlassCard>
                <div className="text-center text-xs text-muted-foreground p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
                  {interactions.disclaimer || 'Always consult a pharmacist or physician about drug interactions.'}
                </div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Medicines;
