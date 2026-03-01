import { motion } from 'framer-motion';
import { Stethoscope, BrainCircuit, LineChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: 'easeOut' },
  }),
};

const MindForgeHero = () => {
  const navigate = useNavigate();

  const handlePrimary = () => navigate('/login');
  const handleSecondary = () => {
    const el = document.getElementById('mindforge-learn-more');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -top-40 -left-32 h-80 w-80 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute top-10 right-0 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 md:flex-row md:items-center md:justify-between md:py-24 lg:px-6">
        {/* Left: Copy */}
        <motion.div
          className="max-w-xl space-y-6"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-100 shadow-sm shadow-sky-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>IMPACT-AI-THON • Care and Cure Track</span>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
              MindForge
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              AI-Driven Clinical Decision Support
              <span className="block bg-gradient-to-r from-sky-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent">
                & Patient Report Understanding
              </span>
            </h1>
          </div>

          <p className="max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
            MindForge acts as a safety-focused co-pilot for clinicians and patients — turning raw
            lab data and medical reports into clear, actionable insights without replacing the
            doctor&apos;s judgement.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handlePrimary}
              className="group inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(56,189,248,0.45)] transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              Get Started
              <span className="ml-1.5 text-base transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </button>

            <button
              onClick={handleSecondary}
              className="inline-flex items-center justify-center rounded-full border border-slate-600/70 bg-slate-900/40 px-5 py-2.5 text-sm font-medium text-slate-100 shadow-sm shadow-slate-900/60 backdrop-blur-md transition hover:border-sky-400/70 hover:bg-slate-900/70"
            >
              Learn More
            </button>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300/90">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 backdrop-blur">
              <Stethoscope size={14} className="text-sky-300" />
              <span>Clinician-first design</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 backdrop-blur">
              <BrainCircuit size={14} className="text-emerald-300" />
              <span>Explainable AI insights</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 backdrop-blur">
              <LineChart size={14} className="text-cyan-300" />
              <span>Longitudinal lab trends</span>
            </div>
          </div>
        </motion.div>

        {/* Right: Illustration */}
        <motion.div
          className="relative mx-auto w-full max-w-md md:max-w-lg"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
        >
          <div className="relative rounded-3xl bg-slate-900/60 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.9)] ring-1 ring-slate-700/60 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/20">
                  <BrainCircuit size={20} className="text-sky-300" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">Clinical Reasoning Engine</p>
                  <p className="text-[11px] text-slate-400">Real-time risk stratification</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                Live Beta
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 rounded-2xl bg-slate-900/70 p-3 shadow-inner shadow-slate-900/60">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Patient Snapshot
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <p>
                    <span className="text-slate-400">Name:</span> R. Kumar, 54y
                  </p>
                  <p>
                    <span className="text-slate-400">Context:</span> Recurrent chest discomfort, DM
                    & HTN
                  </p>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
                </div>
                <p className="text-[11px] text-amber-300">
                  Elevated cardiovascular risk. Prioritize follow-up within 24–48 hours.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl bg-slate-900/70 p-3 shadow-inner shadow-slate-900/60">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Lab Signal Board
                </p>
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>HbA1c</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                      8.2 %
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>LDL-C</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                      162 mg/dL
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>eGFR</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                      62 mL/min
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-300">
                  MindForge highlights patterns while keeping the clinician fully in control.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MindForgeHero;

