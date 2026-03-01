import { motion } from 'framer-motion';

const stats = [
  {
    label: 'Faster Clinical Decisions',
    value: '30–40%',
    body: 'Reduction in time spent manually cross-referencing labs and notes in pilot workflows.',
  },
  {
    label: 'Improved Patient Understanding',
    value: '2×',
    body: 'Increase in patients who report “clearly understood my lab report” in debrief surveys.',
  },
  {
    label: 'Reduced Cognitive Load',
    value: '25%',
    body: 'Fewer “high-load” cases per shift as scored by participating clinicians.',
  },
];

const MindForgeImpact = () => {
  return (
    <section className="bg-slate-50 px-4 py-14 sm:py-18 md:py-20 lg:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <motion.h2
            className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
          >
            Designed for Measurable Impact
          </motion.h2>
          <motion.p
            className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: 0.05 }}
          >
            MindForge is not just a demo — it is architected around metrics that matter to
            hospitals, clinicians, and patients.
          </motion.p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {stats.map(({ label, value, body }, index) => (
            <motion.div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm shadow-slate-200/80 transition-shadow duration-200 hover:shadow-md"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MindForgeImpact;

