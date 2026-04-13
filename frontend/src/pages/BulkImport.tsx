import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard } from '@/components/GlassCard';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'sonner';

const BulkImport = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/api/patients/bulk-import/template/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'patient_import_template.csv';
      a.click();
      toast.success('Template downloaded!');
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) setFile(dropped);
    else toast.error('Please upload a CSV file');
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/api/patients/bulk-import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.created_count > 0) toast.success(`${data.created_count} patients imported!`);
      if (data.error_count > 0) toast.error(`${data.error_count} rows had errors`);
    } catch {
      toast.error('Import failed. Please check your CSV format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Bulk Import Patients</h2>
            <p className="text-slate-400 text-sm mt-1">Upload a CSV file to add multiple patients at once</p>
          </div>
          <button onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-cyan-400/40 hover:text-cyan-400 transition-all">
            <Download className="w-4 h-4" /> Download Template
          </button>
        </div>

        {/* CSV Format Guide */}
        <GlassCard className="p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" /> CSV Format
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-cyan-400 border-b border-slate-700/50">
                  {['first_name*', 'last_name*', 'date_of_birth*', 'gender*', 'blood_group', 'contact', 'email', 'address'].map(h => (
                    <th key={h} className="text-left py-2 px-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-400">
                  <td className="py-2 px-2">Rahul</td>
                  <td className="py-2 px-2">Sharma</td>
                  <td className="py-2 px-2">1985-06-15</td>
                  <td className="py-2 px-2">M</td>
                  <td className="py-2 px-2">A+</td>
                  <td className="py-2 px-2">9876543210</td>
                  <td className="py-2 px-2">rahul@email.com</td>
                  <td className="py-2 px-2">Mumbai</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">* Required fields · Gender: M/F/O · Date: YYYY-MM-DD</p>
        </GlassCard>

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
          className="relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all"
          style={{
            borderColor: dragging ? '#00d4ff' : file ? '#00ff88' : 'rgba(0,212,255,0.2)',
            background: dragging ? 'rgba(0,212,255,0.05)' : 'rgba(6,20,40,0.5)',
          }}>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)} />

          <Upload className="w-10 h-10 mx-auto mb-4" style={{ color: file ? '#00ff88' : '#00d4ff' }} />

          {file ? (
            <div>
              <p className="text-green-400 font-semibold">{file.name}</p>
              <p className="text-slate-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB · Ready to import</p>
            </div>
          ) : (
            <div>
              <p className="text-foreground font-semibold mb-1">Drop your CSV file here</p>
              <p className="text-slate-400 text-sm">or click to browse</p>
            </div>
          )}
        </div>

        {file && (
          <div className="flex gap-3">
            <button onClick={handleUpload} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
              {loading ? (
                <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Importing...</>
              ) : (
                <><Upload className="w-4 h-4" /> Import {file.name}</>
              )}
            </button>
            <button onClick={() => { setFile(null); setResult(null); }}
              className="px-5 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-500 transition-all">
              Clear
            </button>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Created', value: result.created_count, color: '#00ff88', icon: CheckCircle },
                  { label: 'Skipped', value: result.skipped_count, color: '#ffb800', icon: AlertTriangle },
                  { label: 'Errors', value: result.error_count, color: '#ff4757', icon: XCircle },
                ].map(s => (
                  <GlassCard key={s.label} className="p-4 text-center">
                    <s.icon className="w-6 h-6 mx-auto mb-2" style={{ color: s.color }} />
                    <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                  </GlassCard>
                ))}
              </div>

              {/* Created list */}
              {result.created?.length > 0 && (
                <GlassCard className="p-4">
                  <h4 className="text-green-400 font-semibold text-sm mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Successfully Created
                  </h4>
                  <div className="space-y-1">
                    {result.created.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-green-400/5">
                        <span className="text-foreground">{p.name}</span>
                        <span className="text-slate-500 font-mono">ID: {p.id}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Errors */}
              {result.errors?.length > 0 && (
                <GlassCard className="p-4">
                  <h4 className="text-red-400 font-semibold text-sm mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Errors
                  </h4>
                  <div className="space-y-2">
                    {result.errors.map((e: any, i: number) => (
                      <div key={i} className="text-xs p-3 rounded-lg bg-red-400/5 border border-red-400/10">
                        <span className="text-red-400 font-mono">Row {e.row}:</span>
                        <span className="text-slate-300 ml-2">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {result.created_count > 0 && (
                <button onClick={() => navigate('/patients')}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)' }}>
                  View All Patients →
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default BulkImport;
