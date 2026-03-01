import { motion } from 'framer-motion';
import { Stethoscope, FileSearch, Radar } from 'lucide-react';

const features = [
  {
    title: 'AI Clinical Decision Support',
    icon: Stethoscope,
    body: 'Surfaces guideline-aligned signals, trajectories, and red flags to help clinicians prioritize safely.',
  },
  {
    title: 'Smart Medical Report Interpretation',
    icon: FileSearch,
    body: 'Transforms dense PDFs into clear, patient-friendly narratives without suggesting diagnoses or prescriptions.',
  },
  {
    title: 'Risk Stratification & Insights',
    icon: Radar,
    body: 'Clusters patients by risk and follow-up urgency, powered by longitudinal lab and symptom patterns.',
  },
];

const MindForgeSolution = () => {
  return (
    <section className="bg-slate-900 px-4 py-14 text-slate-50 sm:py-18 md:py-20 lg:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <motion.h2
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
          >
            How MindForge Solves This
          </motion.h2>
          <motion.p
            className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: 0.05 }}
          >
            We combine explainable AI with hospital-grade workflows so that every signal is
            transparent, auditable, and mapped back to the clinician&apos;s reasoning process.
          </motion.p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map(({ title, icon: Icon, body }, index) => (
            <motion.div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.8)] backdrop-blur-md transition-transform duration-200 hover:-translate-y-1.5 hover:shadow-[0_26px_70px_rgba(15,23,42,0.95)]"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.07 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-cyan-500/10 to-emerald-500/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
                  <Icon size={18} />
                </div>
                <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MindForgeSolution;

