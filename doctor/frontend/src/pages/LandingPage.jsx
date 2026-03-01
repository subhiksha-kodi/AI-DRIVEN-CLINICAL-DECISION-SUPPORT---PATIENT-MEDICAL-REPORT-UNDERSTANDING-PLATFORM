import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Shield, Zap, BookOpen, Search,
  BarChart3, Heart, Users, ArrowRight, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────
 *  Blue (Admin) theme classes — all static so Tailwind JIT
 *  can scan & include them in the production bundle.
 * ───────────────────────────────────────────────────────────── */
const adminTheme = {
  badge: 'bg-blue-100 text-blue-700',
  tagText: 'text-blue-600',
  heroBg: 'from-blue-50',
  heroBall: 'bg-blue-200/30',
  cardGlow: 'bg-blue-600/10',
  cardGlowHover: 'hover:bg-blue-600/20',
  headerIcon: 'bg-blue-600',
  progressBar: 'bg-blue-600',
  getStarted: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30',
  divider: 'bg-blue-600',
  problemIcon: 'text-blue-600',
  problemIconHover: 'group-hover:bg-blue-600',
  solutionBg: 'bg-blue-900',
  impactText: 'text-blue-600',
  ctaGradient: 'from-blue-600 to-blue-800',
  footerIcon: 'bg-blue-600',
  loginPath: '/login',
};

/* ─────────────────────────────────────────────────────────────
 *  Green (Doctor) theme classes
 * ───────────────────────────────────────────────────────────── */
const doctorTheme = {
  badge: 'bg-emerald-100 text-emerald-700',
  tagText: 'text-emerald-600',
  heroBg: 'from-emerald-50',
  heroBall: 'bg-emerald-200/30',
  cardGlow: 'bg-emerald-600/10',
  cardGlowHover: 'hover:bg-emerald-600/20',
  headerIcon: 'bg-emerald-600',
  progressBar: 'bg-emerald-600',
  getStarted: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30',
  divider: 'bg-emerald-600',
  problemIcon: 'text-emerald-600',
  problemIconHover: 'group-hover:bg-emerald-600',
  solutionBg: 'bg-emerald-900',
  impactText: 'text-emerald-600',
  ctaGradient: 'from-emerald-600 to-emerald-800',
  footerIcon: 'bg-emerald-600',
  loginPath: '/doctor/login',
};

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.12 } },
};

const problemCards = [
  {
    icon: Shield,
    title: 'Information Overload',
    desc: 'Doctors are buried under massive amounts of clinical data and complex lab reports, slowing critical thinking.',
  },
  {
    icon: Search,
    title: 'Language Barrier',
    desc: 'Patients struggle to decode technical medical jargon, leading to anxiety, confusion, and poor adherence.',
  },
  {
    icon: AlertCircle,
    title: 'Decision Delay',
    desc: 'Critical interpretation delays can hinder timely and safe clinical decision-making when seconds matter.',
  },
];

const solutionCards = [
  {
    icon: Zap,
    title: 'AI Clinical Decision Support',
    desc: 'Rule-based and LLM-powered insights that surface critical abnormalities instantly for clinicians.',
  },
  {
    icon: BookOpen,
    title: 'Smart Report Interpretation',
    desc: 'Transforms complex lab results into clear, actionable, and human-readable patient summaries.',
  },
  {
    icon: BarChart3,
    title: 'Risk Stratification & Insights',
    desc: 'Visualizes physiological trends over time to identify early warning signs and track patient progress.',
  },
];

const impactItems = [
  { val: '65%', label: 'Faster Clinical Decisions', desc: 'Automated extraction and risk analysis saves vital minutes.' },
  { val: '90%', label: 'Improved Patient Understanding', desc: 'Clear narratives replace cryptic medical terminology.' },
  { val: '40%', label: 'Reduced Cognitive Load', desc: 'Synthesized insights prioritize critical focus areas.' },
];

const LandingPage = ({ theme = 'admin' }) => {
  const t = theme === 'doctor' ? doctorTheme : adminTheme;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className={`relative pt-24 pb-32 px-6 overflow-hidden bg-gradient-to-b ${t.heroBg} to-white`}>
        <div className={`absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 ${t.heroBall} rounded-full blur-3xl`} />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 bg-slate-200/50 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-24">

            {/* Left copy */}
            <motion.div
              className="lg:w-1/2 text-center lg:text-left"
              initial={{ opacity: 0, x: -48 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.span
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${t.badge} text-xs font-bold uppercase tracking-widest mb-7`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <Zap size={13} /> IMPACT-AI-THON | Care and Cure Track
              </motion.span>

              <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight mb-6 text-slate-900">
                Mind<span className={t.tagText}>Forge</span>
              </h1>

              <p className="text-xl lg:text-2xl text-slate-600 mb-10 leading-relaxed font-medium max-w-xl">
                AI-Driven Clinical Decision Support &amp; Patient Medical Report Understanding
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to={t.loginPath}
                  className={`inline-flex items-center gap-2 px-8 py-4 ${t.getStarted} text-white rounded-2xl font-bold text-lg shadow-xl transition-all hover:-translate-y-1 active:scale-95 group`}
                >
                  Get Started <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
                <a
                  href="#problem"
                  className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all"
                >
                  Learn More
                </a>
              </div>
            </motion.div>

            {/* Right card illustration */}
            <motion.div
              className="lg:w-1/2 flex justify-center w-full"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative group w-full max-w-md">
                <div className={`absolute -inset-4 ${t.cardGlow} ${t.cardGlowHover} rounded-3xl blur-2xl transition-all duration-500`} />
                <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-3xl p-8">
                  {/* Card header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`w-12 h-12 ${t.headerIcon} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      <Activity size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">MindForge Analysis</h3>
                      <p className="text-sm text-slate-500">Processing clinical data…</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                    <motion.div
                      className={`h-full ${t.progressBar}`}
                      initial={{ width: '0%' }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 1.6, delay: 0.9 }}
                    />
                  </div>

                  {/* Mini metric cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <Heart className="text-red-500 mb-2" size={18} />
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Stability</p>
                      <p className="text-lg font-bold text-slate-800">High</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <Users className="text-blue-500 mb-2" size={18} />
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Recovery</p>
                      <p className="text-lg font-bold text-slate-800">92%</p>
                    </div>
                  </div>

                  {/* Terminal-like output */}
                  <div className="p-4 bg-slate-900 rounded-2xl">
                    <p className="text-emerald-400 text-xs font-mono mb-1">{'>'} Running diagnostics…</p>
                    <p className="text-slate-300 text-sm font-medium">Critical biomarkers within normal range. No alerts.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────── */}
      <section id="problem" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              className="text-4xl font-bold text-slate-900 mb-4"
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              The Healthcare Gap
            </motion.h2>
            <motion.div
              className={`h-1.5 ${t.divider} mx-auto rounded-full`}
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              style={{ width: 0 }}
            />
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {problemCards.map((item, i) => (
              <motion.div
                key={i}
                className="p-8 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
                variants={fadeInUp}
              >
                <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center ${t.problemIcon} shadow-md ${t.problemIconHover} group-hover:text-white transition-all duration-300 mb-6`}>
                  <item.icon size={26} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SOLUTION ─────────────────────────────────────────── */}
      <section className={`py-24 px-6 ${t.solutionBg} text-white relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent blur-3xl opacity-20" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How MindForge Solves This</h2>
            <div className="w-20 h-1.5 bg-white/30 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {solutionCards.map((item, i) => (
              <motion.div
                key={i}
                className="p-8 bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl hover:bg-white/[0.15] transition-all group"
                whileHover={{ y: -10 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                  <item.icon size={26} />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-white/70 leading-relaxed text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMPACT ───────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              className="text-4xl font-bold text-slate-900 mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Real Impact
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            {impactItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.18 }}
                className="p-8 bg-white rounded-3xl shadow-lg shadow-slate-200/60 border border-slate-100"
              >
                <p className={`text-5xl font-extrabold ${t.impactText} mb-2`}>{item.val}</p>
                <h4 className="text-lg font-bold text-slate-800 mb-2">{item.label}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className={`p-12 lg:p-16 bg-gradient-to-br ${t.ctaGradient} rounded-[3rem] text-white text-center shadow-2xl overflow-hidden relative`}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold mb-5 leading-tight">
                Bridging Intelligence&nbsp;<br />with Healthcare
              </h2>
              <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
                Join the future of medicine where data meets understanding and intelligence saves lives.
              </p>
              <Link
                to={t.loginPath}
                className="inline-flex items-center gap-2 px-10 py-5 bg-white text-slate-900 rounded-2xl font-bold text-xl hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                Enter Platform <ArrowRight size={22} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="py-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 ${t.footerIcon} rounded-lg flex items-center justify-center text-white shadow`}>
              <Activity size={15} />
            </div>
            <span className="font-bold text-slate-800 tracking-tight text-sm">MindForge</span>
          </div>
          <p className="text-slate-400 text-xs font-medium">
            © 2026 MindForge | IMPACT-AI-THON Team. All rights reserved.
          </p>
          <div className="flex gap-5 text-xs text-slate-500 font-medium">
            <a href="#" className="hover:text-slate-800 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-800 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-800 transition-colors">Github</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
