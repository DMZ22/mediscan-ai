/**
 * Feature 6: Assessment Comparison Component
 * Add to PatientDetail.tsx — shows last 2 assessments side by side
 */
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { RiskBadge } from '@/components/RiskBadge';

const getRiskColor = (level: string) => {
  const map: Record<string, string> = {
    low: '#00ff88', medium: '#ffb800', high: '#ff4757', critical: '#9d4edd',
  };
  return map[level?.toLowerCase()] || '#00d4ff';
};

const genHealthLabel = (v: number) =>
  ['', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'][v] || `${v}/5`;

const CompareField = ({ label, a, b, higher_is_bad = true }: {
  label: string; a: any; b: any; higher_is_bad?: boolean;
}) => {
  const aNum = parseFloat(a);
  const bNum = parseFloat(b);
  const diff = aNum - bNum;
  const improved = higher_is_bad ? diff < 0 : diff > 0;
  const worsened = higher_is_bad ? diff > 0 : diff < 0;

  return (
    <div className="grid grid-cols-3 items-center py-2.5 border-b border-slate-800/50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-mono text-center text-slate-300">{b}</span>
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-xs font-mono text-slate-300">{a}</span>
        {!isNaN(diff) && Math.abs(diff) > 0.01 && (
          <span className={`text-xs ${improved ? 'text-green-400' : worsened ? 'text-red-400' : 'text-slate-500'}`}>
            {improved ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
          </span>
        )}
        {!isNaN(diff) && Math.abs(diff) <= 0.01 && <Minus className="w-3 h-3 text-slate-600" />}
      </div>
    </div>
  );
};

export const AssessmentComparison = ({ assessments }: { assessments: any[] }) => {
  if (!assessments || assessments.length < 2) return null;

  const sorted = [...assessments].sort(
    (a, b) => new Date(b.assessed_at).getTime() - new Date(a.assessed_at).getTime()
  );
  const latest = sorted[0];
  const previous = sorted[1];

  const latestScore = Math.round((latest.risk_score || 0) * 100 * 10) / 10;
  const prevScore = Math.round((previous.risk_score || 0) * 100 * 10) / 10;
  const scoreDiff = latestScore - prevScore;
  const improved = scoreDiff < 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-foreground">Assessment Comparison</h3>
          <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border ${
            improved
              ? 'text-green-400 border-green-400/30 bg-green-400/10'
              : scoreDiff > 0
              ? 'text-red-400 border-red-400/30 bg-red-400/10'
              : 'text-slate-400 border-slate-700'
          }`}>
            {improved ? <TrendingDown className="w-4 h-4" /> : scoreDiff > 0 ? <TrendingUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            {improved ? `Improved ${Math.abs(scoreDiff).toFixed(1)}%` : scoreDiff > 0 ? `Worsened ${scoreDiff.toFixed(1)}%` : 'No change'}
          </div>
        </div>

        {/* Score comparison */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Previous', assessment: previous, score: prevScore },
            { label: 'Latest', assessment: latest, score: latestScore },
          ].map(({ label, assessment, score }) => (
            <div key={label} className="p-4 rounded-xl border border-slate-800 text-center"
              style={{ background: 'rgba(6,20,40,0.5)' }}>
              <p className="text-xs text-slate-400 mb-2">{label}</p>
              <p className="text-3xl font-black font-mono mb-2"
                style={{ color: getRiskColor(assessment.risk_level) }}>
                {score}%
              </p>
              <RiskBadge level={assessment.risk_level} />
              <p className="text-xs text-slate-500 mt-2">
                {assessment.assessed_at
                  ? new Date(assessment.assessed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A'}
              </p>
            </div>
          ))}
        </div>

        {/* Field comparison */}
        <div className="rounded-xl border border-slate-800 overflow-hidden p-4"
          style={{ background: 'rgba(6,20,40,0.5)' }}>
          <div className="grid grid-cols-3 text-xs text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-800 mb-1">
            <span>Indicator</span>
            <span className="text-center">Previous</span>
            <span className="text-right">Latest</span>
          </div>
          <CompareField label="BMI" a={latest.bmi} b={previous.bmi} higher_is_bad={true} />
          <CompareField label="Gen. Health" a={genHealthLabel(latest.gen_health)} b={genHealthLabel(previous.gen_health)} higher_is_bad={true} />
          <CompareField
            label="Blood Pressure"
            a={latest.high_bp ? 'High' : 'Normal'}
            b={previous.high_bp ? 'High' : 'Normal'}
            higher_is_bad={true}
          />
          <CompareField label="Mental Health Days" a={latest.ment_health} b={previous.ment_health} higher_is_bad={true} />
          <CompareField label="Physical Health Days" a={latest.phys_health} b={previous.phys_health} higher_is_bad={true} />
          <CompareField
            label="Physical Activity"
            a={latest.phys_activity ? 'Yes' : 'No'}
            b={previous.phys_activity ? 'Yes' : 'No'}
            higher_is_bad={false}
          />
          <CompareField label="Confidence" a={`${Math.round((latest.model_confidence||0)*100)}%`} b={`${Math.round((previous.model_confidence||0)*100)}%`} higher_is_bad={false} />
        </div>
      </GlassCard>
    </motion.div>
  );
};
