import { motion } from 'framer-motion';
import { AlertTriangle, FileText, Clock3 } from 'lucide-react';

const cards = [
  {
    title: 'Doctors overloaded with interpretation',
    icon: AlertTriangle,
    body: 'Clinicians spend critical time stitching together labs, imaging, and notes instead of talking to patients.',
  },
  {
    title: 'Patients struggle with medical reports',
    icon: FileText,
    body: 'Most patients receive PDFs full of jargon, ranges, and acronyms with no simple explanation of what it means.',
  },
  {
    title: 'Delays in safe decision-making',
    icon: Clock3,
    body: 'Fragmented data and cognitive overload can delay risk detection and coordinated care.',
  },
];

const MindForgeProblem = () => {
  return (
    <section
      id="mindforge-learn-more"
      className="bg-slate-50 px-4 py-14 sm:py-18 md:py-20 lg:px-6"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <motion.h2
            className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
          >
            The Healthcare Gap
          </motion.h2>
          <motion.p
            className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: 0.05 }}
          >
            MindForge is built around a simple question: how do we reduce cognitive load on
            clinicians while making every report understandable to patients, without compromising
            safety?
          </motion.p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {cards.map(({ title, icon: Icon, body }, index) => (
            <motion.div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white/90 p-4 text-left shadow-sm shadow-slate-200/70 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Icon size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MindForgeProblem;

