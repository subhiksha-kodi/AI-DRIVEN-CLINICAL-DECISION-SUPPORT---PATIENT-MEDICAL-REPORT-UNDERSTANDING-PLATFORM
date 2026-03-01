import MindForgeHero from '../components/landing/MindForgeHero';
import MindForgeProblem from '../components/landing/MindForgeProblem';
import MindForgeSolution from '../components/landing/MindForgeSolution';
import MindForgeImpact from '../components/landing/MindForgeImpact';
import MindForgeCta from '../components/landing/MindForgeCta';

const MindForgeLandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <MindForgeHero />
      <MindForgeProblem />
      <MindForgeSolution />
      <MindForgeImpact />
      <MindForgeCta />
    </div>
  );
};

export default MindForgeLandingPage;

