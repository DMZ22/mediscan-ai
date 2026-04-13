import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { motion } from 'framer-motion';
import { Bot, Send, Loader2, Stethoscope, FileText, AlertTriangle, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/lib/api';

const URGENCY_COLORS: Record<string, string> = {
  routine: 'bg-green-500/20 text-green-300', soon: 'bg-yellow-500/20 text-yellow-300',
  urgent: 'bg-orange-500/20 text-orange-300', emergency: 'bg-red-500/20 text-red-300',
};

const LIKELIHOOD_COLORS: Record<string, string> = {
  high: 'border-red-500/40', moderate: 'border-yellow-500/40', low: 'border-cyan-500/40',
};

const HealthAssistant = () => {
  // Symptom checker state
  const [symptoms, setSymptoms] = useState('');
  const [symptomResult, setSymptomResult] = useState<any>(null);
  const [symptomLoading, setSymptomLoading] = useState(false);

  // Chat state
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Note summarizer state
  const [notes, setNotes] = useState('');
  const [noteSummary, setNoteSummary] = useState<any>(null);
  const [noteLoading, setNoteLoading] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSymptomAnalysis = async () => {
    if (!symptoms.trim()) return;
    setSymptomLoading(true);
    setSymptomResult(null);
    try {
      const { data } = await api.post('/api/ai/symptoms/', { symptoms });
      setSymptomResult(data);
    } catch {
      toast.error('Symptom analysis failed');
    } finally {
      setSymptomLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setChatLoading(true);
    try {
      const { data } = await api.post('/api/ai/chat/', { message, history: chatHistory });
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNoteSummary = async () => {
    if (!notes.trim()) return;
    setNoteLoading(true);
    setNoteSummary(null);
    try {
      const { data } = await api.post('/api/ai/summarize-notes/', { notes });
      setNoteSummary(data);
    } catch {
      toast.error('Note summarization failed');
    } finally {
      setNoteLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-400" /> AI Health Assistant
          </h2>
          <p className="text-muted-foreground text-sm">Symptom analysis, health chat & clinical note summarization</p>
        </div>

        {/* Disclaimer Banner */}
        <div className="flex items-start gap-2 p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            This AI assistant provides general health information only. It is NOT a substitute for professional medical advice, diagnosis, or treatment.
            Always consult a qualified healthcare provider.
          </p>
        </div>

        <Tabs defaultValue="symptoms" className="space-y-4">
          <TabsList className="bg-background/50 border border-cyan-900/30">
            <TabsTrigger value="symptoms"><Stethoscope className="w-4 h-4 mr-1" /> Symptom Checker</TabsTrigger>
            <TabsTrigger value="chat"><Bot className="w-4 h-4 mr-1" /> Health Chat</TabsTrigger>
            <TabsTrigger value="notes"><FileText className="w-4 h-4 mr-1" /> Note Summarizer</TabsTrigger>
          </TabsList>

          {/* Symptom Checker */}
          <TabsContent value="symptoms" className="space-y-4">
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-3">Describe Your Symptoms</h3>
              <Textarea placeholder="E.g., I've been having persistent headaches for the past week, along with fatigue and occasional dizziness. The pain is usually on the right side..."
                value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={4} className="bg-background/50 resize-none" />
              <Button className="mt-3 w-full bg-cyan-600 hover:bg-cyan-700" onClick={handleSymptomAnalysis} disabled={symptomLoading}>
                {symptomLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Analyze Symptoms'}
              </Button>
            </GlassCard>

            {symptomResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Urgency */}
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Assessment</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${URGENCY_COLORS[symptomResult.urgency_level] || ''}`}>
                      {symptomResult.urgency_level?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{symptomResult.urgency_note}</p>
                </GlassCard>

                {/* Possible Conditions */}
                {symptomResult.possible_conditions?.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">Possible Conditions</h3>
                    <div className="space-y-3">
                      {symptomResult.possible_conditions.map((c: any, i: number) => (
                        <div key={i} className={`p-4 rounded-lg border bg-background/30 ${LIKELIHOOD_COLORS[c.likelihood] || 'border-cyan-900/30'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-foreground">{c.condition}</h4>
                            <div className="flex gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground">{c.likelihood} likelihood</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${c.severity === 'emergency' ? 'bg-red-500/20 text-red-300' : c.severity === 'severe' ? 'bg-orange-500/20 text-orange-300' : 'bg-cyan-500/20 text-cyan-300'}`}>{c.severity}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{c.description}</p>
                          {c.key_symptoms_matched?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {c.key_symptoms_matched.map((s: string, j: number) => (
                                <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Recommended Actions */}
                {symptomResult.recommended_actions?.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-foreground mb-3">Recommended Actions</h3>
                    <ul className="space-y-2">
                      {symptomResult.recommended_actions.map((a: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs shrink-0 mt-0.5">{i + 1}</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                    {symptomResult.specialist_referral && (
                      <p className="mt-3 text-sm text-cyan-400">Suggested specialist: {symptomResult.specialist_referral}</p>
                    )}
                  </GlassCard>
                )}

                {/* Red Flags */}
                {symptomResult.red_flags?.length > 0 && (
                  <GlassCard className="p-6 border-red-500/20">
                    <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Red Flags
                    </h3>
                    <ul className="list-disc list-inside text-sm text-red-300/80 space-y-1">
                      {symptomResult.red_flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  </GlassCard>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* Health Chat */}
          <TabsContent value="chat" className="space-y-4">
            <GlassCard className="p-6">
              <div className="h-96 overflow-y-auto space-y-3 mb-4 pr-2">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Bot className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Ask me anything about health & wellness</p>
                    <p className="text-xs mt-1 opacity-60">I can help with general health questions, lifestyle advice, and medical term explanations</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && <Bot className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />}
                    <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-cyan-600/20 text-foreground' : 'bg-background/50 text-muted-foreground border border-cyan-900/30'}`}>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && <User className="w-6 h-6 text-muted-foreground shrink-0 mt-1" />}
                  </motion.div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2">
                    <Bot className="w-6 h-6 text-cyan-400 shrink-0" />
                    <div className="bg-background/50 rounded-lg p-3 border border-cyan-900/30">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type your health question..." value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()} className="bg-background/50" />
                <Button onClick={handleChatSend} disabled={chatLoading} className="bg-cyan-600 hover:bg-cyan-700">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </GlassCard>
          </TabsContent>

          {/* Note Summarizer */}
          <TabsContent value="notes" className="space-y-4">
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-3">Paste Clinical Notes</h3>
              <Textarea placeholder="Paste doctor's notes, discharge summary, or clinical documentation here..."
                value={notes} onChange={e => setNotes(e.target.value)} rows={6} className="bg-background/50 resize-none" />
              <Button className="mt-3 w-full bg-cyan-600 hover:bg-cyan-700" onClick={handleNoteSummary} disabled={noteLoading}>
                {noteLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Summarizing...</> : 'Summarize Notes'}
              </Button>
            </GlassCard>

            {noteSummary && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <GlassCard className="p-6">
                  <h3 className="font-semibold text-foreground mb-3">Summary</h3>
                  <p className="text-sm text-muted-foreground mb-4">{noteSummary.summary}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {noteSummary.key_findings?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-cyan-400 mb-2">Key Findings</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {noteSummary.key_findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                    {noteSummary.diagnoses?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-purple-400 mb-2">Diagnoses</h4>
                        <div className="flex flex-wrap gap-1">
                          {noteSummary.diagnoses.map((d: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">{d}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {noteSummary.medications_mentioned?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-400 mb-2">Medications</h4>
                        <div className="flex flex-wrap gap-1">
                          {noteSummary.medications_mentioned.map((m: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-300 border border-green-500/20">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {noteSummary.concerns?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Concerns</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {noteSummary.concerns.map((c: string, i: number) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {noteSummary.follow_up && (
                    <div className="mt-4 p-3 bg-cyan-500/5 rounded-lg">
                      <h4 className="text-sm font-medium text-cyan-400 mb-1">Follow-up</h4>
                      <p className="text-sm text-muted-foreground">{noteSummary.follow_up}</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default HealthAssistant;
