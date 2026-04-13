import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Shield, Brain, Activity, Users, ChevronRight,
  Database, Zap, BarChart3, Lock, ArrowRight, Star
} from 'lucide-react';

const STATS = [
  { value: '83%', label: 'Model Accuracy', sub: 'ROC-AUC: 0.83' },
  { value: '70K+', label: 'Training Records', sub: 'CDC Health Survey' },
  { value: '4', label: 'ML Algorithms', sub: 'Stacking Ensemble' },
  { value: '88%', label: 'Recall Rate', sub: 'Clinical Sensitivity' },
];

const FEATURES = [
  {
    icon: Brain,
    title: 'Ensemble ML Engine',
    desc: 'Stacking ensemble of Random Forest, XGBoost, LightGBM & Gradient Boosting with SMOTETomek resampling for superior class balance.',
    color: '#00d4ff',
  },
  {
    icon: Activity,
    title: 'Real-Time Risk Assessment',
    desc: 'Submit 21 CDC health indicators and receive instant diabetes risk probability with confidence scores and clinical recommendations.',
    color: '#00ff88',
  },
  {
    icon: BarChart3,
    title: 'SHAP Explainability',
    desc: 'Understand exactly which health factors drive each prediction with perturbation-based feature importance scores.',
    color: '#ffb800',
  },
  {
    icon: Database,
    title: 'PostgreSQL Backend',
    desc: 'Full patient history, assessment timelines, and analytics powered by Django REST Framework with JWT authentication.',
    color: '#ff4757',
  },
  {
    icon: Shield,
    title: 'Clinical Grade Security',
    desc: 'Role-based access control for doctors, nurses, and admins. Every assessment is logged with assessor attribution.',
    color: '#9d4edd',
  },
  {
    icon: Zap,
    title: 'Analytics Dashboard',
    desc: 'Risk distribution trends, age group analysis, monthly cohort charts and real-time activity feed.',
    color: '#00d4ff',
  },
];

const TECH = [
  'Django REST Framework', 'PostgreSQL', 'Random Forest', 'XGBoost',
  'LightGBM', 'Gradient Boosting', 'SMOTETomek', 'SHAP Values',
  'JWT Auth', 'React 18', 'TypeScript', 'Recharts',
];

// Animated counter hook
const useCounter = (target: number, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
};

// Particle field
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.4 + 0.1,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${p.a})`;
        ctx.fill();
      });
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// Glowing orb
const GlowOrb = ({ color, size, x, y, blur }: { color: string; size: number; x: string; y: string; blur: number }) => (
  <div className="absolute pointer-events-none" style={{
    left: x, top: y, width: size, height: size,
    borderRadius: '50%', background: color,
    filter: `blur(${blur}px)`, opacity: 0.15,
    transform: 'translate(-50%, -50%)',
  }} />
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{
      background: 'linear-gradient(135deg, #020b18 0%, #030f1e 50%, #020b18 100%)',
      fontFamily: "'Exo 2', sans-serif",
    }}>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
        <ParticleField />
        <GlowOrb color="#00d4ff" size={600} x="20%" y="30%" blur={120} />
        <GlowOrb color="#9d4edd" size={400} x="80%" y="60%" blur={100} />
        <GlowOrb color="#00ff88" size={300} x="70%" y="20%" blur={80} />

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)' }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-wide">MediScan AI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-xl text-sm text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/10 transition-all">
              Sign In
            </button>
            <button onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 text-cyan-400 text-xs font-medium mb-8 backdrop-blur-sm">
            <Star className="w-3 h-3" />
            Trained on 70,692 CDC Health Survey Records
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6"
            style={{ textShadow: '0 0 80px rgba(0,212,255,0.2)' }}>
            Clinical AI for
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Diabetes Risk
            </span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            A stacking ensemble of Random Forest, XGBoost, LightGBM and Gradient Boosting
            that predicts diabetes risk with <strong className="text-white">83% accuracy</strong> and <strong className="text-white">88% recall</strong>.
            Built for doctors. Powered by real data.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold text-white transition-all hover:scale-105 hover:shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #2563eb)',
                boxShadow: '0 0 30px rgba(0,212,255,0.4)',
              }}>
              Register as Doctor
              <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-medium text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all">
              <Lock className="w-4 h-4" />
              Sign In to Dashboard
            </button>
          </div>

          {/* Floating badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {['ROC-AUC: 0.83', 'F1: 0.78', 'SMOTETomek', 'SHAP Values', 'JWT Secured'].map(badge => (
              <span key={badge} className="px-3 py-1.5 rounded-full text-xs font-mono text-cyan-400 border border-cyan-400/20 bg-cyan-400/5">
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 text-xs animate-bounce">
          <span>Scroll to explore</span>
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="py-20 px-6 relative">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, transparent, rgba(0,212,255,0.03), transparent)',
        }} />
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="text-center p-6 rounded-2xl border border-slate-800 hover:border-cyan-400/30 transition-all"
              style={{ background: 'rgba(6,20,40,0.8)', backdropFilter: 'blur(20px)' }}>
              <p className="text-4xl font-black mb-2"
                style={{
                  background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                {s.value}
              </p>
              <p className="text-white font-semibold text-sm mb-1">{s.label}</p>
              <p className="text-slate-500 text-xs font-mono">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">Clinical Workflow</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">How MediScan Works</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Three steps from patient registration to AI-powered risk assessment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5"
              style={{ background: 'linear-gradient(90deg, #00d4ff, #9d4edd)' }} />

            {[
              { num: '01', title: 'Register Patient', desc: 'Add patient demographics, medical history, blood group and contact details to the system.', color: '#00d4ff' },
              { num: '02', title: 'Enter Health Data', desc: 'Submit 21 CDC health indicators including BMI, blood pressure, lifestyle factors and age category.', color: '#00ff88' },
              { num: '03', title: 'Get AI Prediction', desc: 'Receive instant diabetes risk score, SHAP factor breakdown, ensemble analysis and clinical recommendations.', color: '#9d4edd' },
            ].map((step, i) => (
              <div key={i} className="relative p-6 rounded-2xl border border-slate-800 hover:border-slate-600 transition-all group"
                style={{ background: 'rgba(6,20,40,0.8)', backdropFilter: 'blur(20px)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black mb-4 border"
                  style={{ color: step.color, borderColor: step.color + '40', background: step.color + '15' }}>
                  {step.num}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, transparent, ${step.color}, transparent)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <GlowOrb color="#9d4edd" size={500} x="90%" y="50%" blur={120} />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">Platform Features</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Everything You Need</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Built for clinical environments with production-grade security and performance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-slate-800 hover:border-slate-600 transition-all group cursor-default"
                style={{ background: 'rgba(6,20,40,0.7)', backdropFilter: 'blur(20px)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 border transition-all group-hover:scale-110"
                  style={{ color: f.color, borderColor: f.color + '30', background: f.color + '10' }}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-white font-bold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-8">Built With</p>
          <div className="flex flex-wrap justify-center gap-3">
            {TECH.map(t => (
              <span key={t} className="px-4 py-2 rounded-xl text-sm font-mono text-slate-300 border border-slate-700 hover:border-cyan-400/40 hover:text-cyan-400 transition-all cursor-default"
                style={{ background: 'rgba(6,20,40,0.8)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── ML MODEL CARD ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 md:p-12 rounded-3xl border border-slate-700 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(6,20,40,0.95), rgba(3,14,30,0.98))' }}>
            <GlowOrb color="#00d4ff" size={300} x="80%" y="30%" blur={80} />
            <div className="relative z-10">
              <p className="text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">ML Architecture</p>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-6">Stacking Ensemble Model</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { name: 'Random Forest', role: 'Base Learner', color: '#00d4ff' },
                  { name: 'XGBoost', role: 'Base Learner', color: '#00ff88' },
                  { name: 'LightGBM', role: 'Base Learner', color: '#ffb800' },
                  { name: 'Logistic Reg.', role: 'Meta Learner', color: '#9d4edd' },
                ].map(m => (
                  <div key={m.name} className="p-4 rounded-xl border text-center"
                    style={{ borderColor: m.color + '30', background: m.color + '08' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: m.color }}>{m.name}</p>
                    <p className="text-xs text-slate-500">{m.role}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Accuracy', value: '84.4%' },
                  { label: 'ROC-AUC', value: '0.8303' },
                  { label: 'F1-Score', value: '0.7751' },
                  { label: 'Recall', value: '0.8765' },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-2xl font-black text-white">{m.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <GlowOrb color="#00d4ff" size={600} x="50%" y="50%" blur={150} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Start Assessing
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Patient Risk Today</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Join doctors already using MediScan AI to make faster, more accurate clinical decisions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl text-lg font-bold text-white transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #2563eb)',
                boxShadow: '0 0 40px rgba(0,212,255,0.5)',
              }}>
              <Users className="w-5 h-5" />
              Register as Doctor
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl text-lg font-medium text-slate-300 border border-slate-700 hover:border-slate-500 transition-all">
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-800 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #2563eb)' }}>
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold">MediScan AI</span>
        </div>
        <p className="text-slate-600 text-xs font-mono mb-4">
          Built with Django · PostgreSQL · React · scikit-learn · XGBoost · LightGBM
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <span className="text-slate-500">Built by</span>
          <span className="text-slate-300 font-semibold">Daksh Trivedi</span>
          <a href="mailto:dakshtrivedi2@gmail.com"
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
            dakshtrivedi2@gmail.com
          </a>
          <a href="https://github.com/Daksh910" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            Daksh910
          </a>
          <a href="https://www.linkedin.com/in/daksh-trivedi-68bab8259" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;