import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MindForgeCta = () => {
  const navigate = useNavigate();

  const handleEnter = () => navigate('/login');

  return (
    <section className="bg-slate-900 px-4 py-14 text-slate-50 sm:py-18 md:py-20 lg:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <motion.h2
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.55 }}
        >
          Bridging Intelligence with Healthcare
        </motion.h2>
        <motion.p
          className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.55, delay: 0.05 }}
        >
          MindForge is built to sit inside real clinical and patient portals — augmenting judgement,
          not replacing it. Step into the platform to see how AI can be safely embedded into care
          journeys.
        </motion.p>
        <motion.div
          className="mt-7 flex justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <button
            onClick={handleEnter}
            className="inline-flex items-center justify-center rounded-full bg-sky-500 px-7 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(56,189,248,0.45)] transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Enter Platform
            <span className="ml-1.5 text-base">↗</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default MindForgeCta;

