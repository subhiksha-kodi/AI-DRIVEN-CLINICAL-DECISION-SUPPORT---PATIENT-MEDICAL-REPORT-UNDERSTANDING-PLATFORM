import { useState } from 'react';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Pill,
  Activity,
  Heart,
  Stethoscope,
  Info,
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  FileWarning,
  Lightbulb,
  Target,
  Scale,
  Thermometer,
  UserCheck,
  ClipboardList,
  BadgeAlert,
  HeartPulse,
  Siren,
  BookOpen,
  ShieldAlert,
  Dumbbell,
  Apple,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../translations/patientReports';
import DietChartTab from './DietChartTab';

/**
 * ClinicalAnalysisDisplay - Enhanced component to display OpenRouter clinical analysis results
 * Supports both prescription and lab report clinical analysis
 */
const ClinicalAnalysisDisplay = ({ clinicalAnalysis, documentType, language = 'en' }) => {
  const lang = language === 'ta' ? 'ta' : 'en';
  const [expandedSections, setExpandedSections] = useState({
    vitalAnalysis: true,
    diagnosisAnalysis: true,
    medicationAnalysis: true,
    drugInteractions: true,
    missingInfo: false,
    clinicalSummary: true,
    patientRisk: true,
    testAnalysis: true,
    abnormalSummary: true,
    conditionSuspicions: true,
    lifestyleRecommendations: true,
    medicalRecommendations: true,
  });

  const [activeSubTab, setActiveSubTab] = useState('analysis'); // 'analysis' or 'diet'

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!clinicalAnalysis) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
            <Brain className="text-gray-400" size={20} />
          </div>
          <div>
            <p className="text-gray-600 font-medium">{t(lang, 'clinicalAnalysisUnavailable')}</p>
            <p className="text-gray-500 text-sm">{t(lang, 'noClinicalData')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Risk Level Badge Component
  const RiskLevelBadge = ({ level }) => {
    const config = {
      low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: Shield, labelKey: 'lowRisk' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertTriangle, labelKey: 'mediumRisk' },
      high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle, labelKey: 'highRisk' },
      critical: { bg: 'bg-red-200', text: 'text-red-800', border: 'border-red-300', icon: Siren, labelKey: 'critical' },
    };

    const levelKey = level?.toLowerCase()?.replace(' ', '_') || 'medium';
    const { bg, text, border, icon: Icon, labelKey } = config[levelKey] || config.medium;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${bg} ${text} ${border}`}>
        <Icon size={14} />
        {t(lang, labelKey)}
      </span>
    );
  };

  // Urgency Badge Component
  const UrgencyBadge = ({ level, requiresImmediate }) => {
    const config = {
      low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
      high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
      critical: { bg: 'bg-red-200', text: 'text-red-800', border: 'border-red-300' },
    };

    const levelKey = level?.toLowerCase() || 'low';
    const { bg, text, border } = config[levelKey] || config.low;

    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${bg} ${text} ${border}`}>
          <Clock size={14} />
          {level?.charAt(0).toUpperCase() + level?.slice(1)} {t(lang, 'urgency')}
        </span>
        {requiresImmediate && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-600 text-white animate-pulse">
            <Siren size={14} />
            {t(lang, 'immediateAttentionRequired')}
          </span>
        )}
      </div>
    );
  };

  // Section Header Component
  const SectionHeader = ({ icon: Icon, title, isExpanded, onToggle, badge, gradient = "from-slate-50 to-white" }) => (
    <motion.button
      whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-3 bg-gradient-to-r ${gradient} border-b border-slate-200 transition-colors`}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-100">
          <Icon size={16} className="text-slate-600" />
        </div>
        <span className="font-bold text-slate-800 text-sm tracking-tight">{title}</span>
        {badge}
      </div>
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <ChevronDown size={16} className="text-slate-400" />
      </motion.div>
    </motion.button>
  );

  // === PRESCRIPTION ANALYSIS COMPONENTS ===

  // Vital Analysis Section
  const VitalAnalysisSection = () => {
    if (!clinicalAnalysis.vital_analysis) return null;
    const vital = clinicalAnalysis.vital_analysis;

    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <SectionHeader
          icon={Thermometer}
          title={t(lang, 'vitalSignsAnalysis')}
          isExpanded={expandedSections.vitalAnalysis}
          onToggle={() => toggleSection('vitalAnalysis')}
          gradient="from-orange-50 to-white"
        />

        <AnimatePresence>
          {expandedSections.vitalAnalysis && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white space-y-3">
                {vital.temperature && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 shadow-sm transition-all hover:bg-slate-100/50">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100">
                        <Thermometer size={18} className="text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-xs mb-2">{t(lang, 'temperature')}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {vital.temperature.value && (
                            <div className="bg-white rounded-lg p-2 border border-slate-100 shadow-inner">
                              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">{t(lang, 'value')}</p>
                              <p className="text-sm font-bold text-slate-900">{vital.temperature.value}</p>
                            </div>
                          )}
                          {vital.temperature.status && (
                            <div className="bg-white rounded-lg p-2 border border-slate-100 shadow-inner">
                              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">{t(lang, 'status')}</p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100">
                                {vital.temperature.status}
                              </span>
                            </div>
                          )}
                          {vital.temperature.possible_implication && (
                            <div className="bg-white rounded-lg p-2 border border-slate-100 shadow-inner md:col-span-1">
                              <div className="flex items-center gap-1.5 mb-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                <Info size={10} />
                                <span>{t(lang, 'implication')}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                {vital.temperature.possible_implication}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Diagnosis Analysis Section
  const DiagnosisAnalysisSection = () => {
    if (!clinicalAnalysis.diagnosis_analysis) return null;
    const diagnosis = clinicalAnalysis.diagnosis_analysis;

    const severityConfig = {
      mild: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
      moderate: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
      severe: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    };

    const severity = diagnosis.severity_level?.toLowerCase() || 'mild';
    const severityStyle = severityConfig[severity] || severityConfig.mild;

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <SectionHeader
          icon={Stethoscope}
          title={t(lang, 'diagnosisAnalysis')}
          isExpanded={expandedSections.diagnosisAnalysis}
          onToggle={() => toggleSection('diagnosisAnalysis')}
          gradient="from-blue-50 to-white"
          badge={diagnosis.severity_level && (
            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${severityStyle.bg} ${severityStyle.text} ${severityStyle.border}`}>
              {diagnosis.severity_level}
            </span>
          )}
        />

        <AnimatePresence>
          {expandedSections.diagnosisAnalysis && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white space-y-3">
                {diagnosis.primary_condition && (
                  <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center border border-blue-100">
                        <Target size={16} className="text-blue-500" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs">{t(lang, 'primaryCondition')}</h4>
                    </div>
                    <p className="text-base font-bold text-blue-900 mb-2">{diagnosis.primary_condition}</p>
                    {diagnosis.condition_explanation && (
                      <div className="bg-white/80 rounded-lg p-2 border border-blue-100 shadow-inner">
                        <p className="text-[9px] text-blue-400 uppercase tracking-wider font-bold mb-1">{t(lang, 'explanation')}</p>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{diagnosis.condition_explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Medication Analysis Section
  const MedicationAnalysisSection = () => {
    if (!clinicalAnalysis.medication_analysis || clinicalAnalysis.medication_analysis.length === 0) return null;

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <SectionHeader
          icon={Pill}
          title={t(lang, 'medicationAnalysis')}
          isExpanded={expandedSections.medicationAnalysis}
          onToggle={() => toggleSection('medicationAnalysis')}
          gradient="from-amber-50 to-white"
          badge={
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
              {clinicalAnalysis.medication_analysis.length} {clinicalAnalysis.medication_analysis.length > 1 ? t(lang, 'medicationsCount') : t(lang, 'medication')}
            </span>
          }
        />

        <AnimatePresence>
          {expandedSections.medicationAnalysis && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white">
                <div className="space-y-4">
                  {clinicalAnalysis.medication_analysis.map((med, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                      {/* Sub-section header */}
                      <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                            <Pill size={20} className="text-amber-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base tracking-tight">{med.medicine_name}</h4>
                            <div className="flex gap-2 mt-0.5">
                              {med.drug_class && (
                                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100/50">
                                  {med.drug_class}
                                </span>
                              )}
                              {med.purpose && (
                                <span className="text-[11px] font-semibold text-slate-400">
                                  {med.purpose}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-mono font-bold text-slate-400 text-xs shadow-inner group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                          #{idx + 1}
                        </div>
                      </div>

                      <div className="space-y-6 relative z-10">
                        {/* Explanation & Condition */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {med.patient_friendly_explanation && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-amber-100 transition-colors group/box">
                              <div className="flex items-center gap-2 mb-2">
                                <Info size={14} className="text-slate-400 group-hover/box:text-amber-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'useOfMedicine')}</p>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">{med.patient_friendly_explanation}</p>
                            </div>
                          )}

                          {med.condition_treated && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-amber-100 transition-colors group/box">
                              <div className="flex items-center gap-2 mb-2">
                                <Target size={14} className="text-slate-400 group-hover/box:text-amber-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'treatedCondition')}</p>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">{med.condition_treated}</p>
                            </div>
                          )}
                        </div>

                        {/* How It Works */}
                        {med.how_it_works && (
                          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:border-amber-100 transition-colors group/box">
                            <div className="flex items-center gap-2 mb-3">
                              <Info size={16} className="text-slate-400 group-hover/box:text-amber-500 transition-colors" />
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'howItWorks')}</p>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">{med.how_it_works}</p>
                          </div>
                        )}

                        {/* Reason for Prescription */}
                        {med.why_prescribed_for_this_case && (
                          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:border-amber-100 transition-colors group/box">
                            <div className="flex items-center gap-2 mb-3">
                              <Target size={16} className="text-slate-400 group-hover/box:text-amber-500 transition-colors" />
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'reasonForPrescription')}</p>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">{med.why_prescribed_for_this_case}</p>
                          </div>
                        )}

                        {/* Dosage Guidelines & Treatment Duration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {med.dosage_instructions && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-amber-100 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Clock size={14} className="text-slate-400 group-hover/box:text-amber-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'dosageGuidelines')}</p>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">{med.dosage_instructions}</p>
                            </div>
                          )}
                          {med.duration && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-amber-100 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Clock size={14} className="text-slate-400 group-hover/box:text-amber-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'treatmentDuration')}</p>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">{med.duration}</p>
                            </div>
                          )}
                        </div>

                        {/* Expected Benefits and Consequences */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {med.benefits_if_taken_properly && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-green-100 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <CheckCircle size={14} className="text-slate-400 group-hover/box:text-green-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'expectedBenefits')}</p>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">{med.benefits_if_taken_properly}</p>
                            </div>
                          )}
                          {med.what_happens_if_not_taken && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-orange-100 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <AlertTriangle size={14} className="text-slate-400 group-hover/box:text-orange-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'ifMissedOrNotTaken')}</p>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">{med.what_happens_if_not_taken}</p>
                            </div>
                          )}
                          {med.what_happens_if_stopped_early && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-red-100 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <AlertCircle size={14} className="text-slate-400 group-hover/box:text-red-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'ifDiscontinuedEarly')}</p>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">{med.what_happens_if_stopped_early}</p>
                            </div>
                          )}
                          {med.what_happens_if_overdosed && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-red-200 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Siren size={14} className="text-slate-400 group-hover/box:text-red-600 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'inCaseOfOverdose')}</p>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">{med.what_happens_if_overdosed}</p>
                            </div>
                          )}
                        </div>

                        {/* Side Effects */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {med.common_side_effects && med.common_side_effects.length > 0 && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-orange-100 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <AlertTriangle size={14} className="text-slate-400 group-hover/box:text-orange-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'commonSideEffects')}</p>
                              </div>
                              <ul className="space-y-1">
                                {med.common_side_effects.map((effect, i) => (
                                  <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                    <span className="w-1 h-1 bg-orange-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                    {effect}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {med.serious_side_effects && med.serious_side_effects.length > 0 && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-red-100 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Siren size={14} className="text-slate-400 group-hover/box:text-red-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'seriousSideEffects')}</p>
                              </div>
                              <ul className="space-y-1">
                                {med.serious_side_effects.map((effect, i) => (
                                  <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                    <span className="w-1 h-1 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                    {effect}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Warnings and Interactions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {med.important_warnings && med.important_warnings.length > 0 && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-red-100 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <ShieldAlert size={14} className="text-slate-400 group-hover/box:text-red-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'warnings')}</p>
                              </div>
                              <ul className="space-y-1">
                                {med.important_warnings.map((warning, i) => (
                                  <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                    <span className="w-1 h-1 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                    {warning}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {med.drug_interactions && med.drug_interactions.length > 0 && (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-orange-100 transition-colors group/box">
                              <div className="flex items-center gap-1.5 mb-2">
                                <BadgeAlert size={14} className="text-slate-400 group-hover/box:text-orange-500 transition-colors" />
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'medicationInteractions')}</p>
                              </div>
                              <ul className="space-y-1">
                                {med.drug_interactions.map((interaction, i) => (
                                  <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                    <span className="w-1 h-1 bg-orange-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                    {interaction}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Interaction Risks */}
                        {med.interaction_risks && med.interaction_risks.length > 0 && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-red-100 transition-colors group/box">
                            <div className="flex items-center gap-1.5 mb-2">
                              <AlertCircle size={14} className="text-slate-400 group-hover/box:text-red-500 transition-colors" />
                              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t(lang, 'possibleInteractionRisks')}</p>
                            </div>
                            <ul className="space-y-1">
                              {med.interaction_risks.map((risk, i) => (
                                <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                  <span className="w-1 h-1 bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Drug Interactions Section
  const DrugInteractionsSection = () => {
    if (!clinicalAnalysis.drug_interaction_risk || clinicalAnalysis.drug_interaction_risk.length === 0) return null;

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
        <SectionHeader
          icon={ShieldAlert}
          title={t(lang, 'drugInteractionRisks')}
          isExpanded={expandedSections.drugInteractions}
          onToggle={() => toggleSection('drugInteractions')}
          gradient="from-red-50 to-white"
          badge={
            <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 shadow-sm">
              {clinicalAnalysis.drug_interaction_risk.length} {clinicalAnalysis.drug_interaction_risk.length > 1 ? t(lang, 'interactions') : t(lang, 'interaction')}
            </span>
          }
        />

        <AnimatePresence>
          {expandedSections.drugInteractions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-5 bg-white space-y-4">
                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border border-red-100">
                      <AlertTriangle size={18} className="text-red-500" />
                    </div>
                    <p className="text-sm text-red-800 font-medium leading-relaxed">
                      {t(lang, 'drugInteractionsNotice')}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {clinicalAnalysis.drug_interaction_risk.map((interaction, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-gradient-to-r from-red-50/30 to-orange-50/30 rounded-xl border border-red-100 shadow-sm group hover:from-red-50 hover:to-orange-50 transition-all"
                    >
                      <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0 border border-red-100 group-hover:scale-110 transition-transform">
                        <Zap size={16} className="text-red-600" />
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed pt-0.5">{interaction}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Missing Information Section
  const MissingInfoSection = () => {
    if (!clinicalAnalysis.missing_critical_information || clinicalAnalysis.missing_critical_information.length === 0) return null;

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <SectionHeader
          icon={BadgeAlert}
          title={t(lang, 'missingCriticalInfo')}
          isExpanded={expandedSections.missingInfo}
          onToggle={() => toggleSection('missingInfo')}
          gradient="from-amber-50 to-white"
        />

        <AnimatePresence>
          {expandedSections.missingInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white">
                <div className="space-y-2">
                  {clinicalAnalysis.missing_critical_information.map((info, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-2.5 p-3 bg-amber-50/50 rounded-xl border border-amber-100 shadow-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-amber-100">
                        <Info size={12} className="text-amber-500" />
                      </div>
                      <p className="text-xs text-amber-900 font-medium leading-relaxed">{info}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // === LAB REPORT ANALYSIS COMPONENTS ===

  // Patient Risk Profile Section
  const PatientRiskProfileSection = () => {
    if (!clinicalAnalysis.patient_risk_profile) return null;
    const risk = clinicalAnalysis.patient_risk_profile;

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
        <SectionHeader
          icon={UserCheck}
          title={t(lang, 'patientRiskProfile')}
          isExpanded={expandedSections.patientRisk}
          onToggle={() => toggleSection('patientRisk')}
          gradient="from-blue-50 to-white"
          badge={risk.overall_risk_category && (
            <RiskLevelBadge level={risk.overall_risk_category} />
          )}
        />

        <AnimatePresence>
          {expandedSections.patientRisk && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {risk.age_related_risk && (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock size={14} className="text-purple-600" />
                        <p className="text-[9px] text-purple-600 uppercase tracking-widest font-bold">{t(lang, 'ageRelatedRisk')}</p>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">{risk.age_related_risk}</p>
                    </div>
                  )}
                  {risk.gender_related_risk && (
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-3 border border-pink-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <UserCheck size={14} className="text-pink-600" />
                        <p className="text-[9px] text-pink-600 uppercase tracking-widest font-bold">{t(lang, 'genderRelatedRisk')}</p>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">{risk.gender_related_risk}</p>
                    </div>
                  )}
                  {risk.bmi_estimation && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Scale size={14} className="text-emerald-600" />
                        <p className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold">{t(lang, 'bmiEstimation')}</p>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">{risk.bmi_estimation}</p>
                    </div>
                  )}
                  {risk.overall_risk_category && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Shield size={14} className="text-blue-600" />
                        <p className="text-[9px] text-blue-600 uppercase tracking-widest font-bold">{t(lang, 'overallRisk')}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{risk.overall_risk_category}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Test Analysis Section (for lab reports)
  const TestAnalysisSection = () => {
    if (!clinicalAnalysis.test_analysis || clinicalAnalysis.test_analysis.length === 0) return null;

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
        <SectionHeader
          icon={Activity}
          title={t(lang, 'detailedTestAnalysis')}
          isExpanded={expandedSections.testAnalysis}
          onToggle={() => toggleSection('testAnalysis')}
          gradient="from-blue-50 to-white"
          badge={
            <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
              {clinicalAnalysis.test_analysis.length} {clinicalAnalysis.test_analysis.length > 1 ? t(lang, 'tests') : t(lang, 'test')}
            </span>
          }
        />

        <AnimatePresence>
          {expandedSections.testAnalysis && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white">
                <div className="space-y-3">
                  {clinicalAnalysis.test_analysis.map((test, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Activity size={18} className="text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{test.test_name}</h4>
                            {test.result_value && (
                              <p className="text-xs text-slate-600">
                                {t(lang, 'result')}: <span className="font-semibold text-blue-700">{test.result_value}</span>
                                {test.unit && <span className="ml-1 text-blue-600">{test.unit}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                        {test.status && (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${test.status === 'normal' ? 'bg-green-100 text-green-700 border border-green-200' :
                            test.status === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                              test.status === 'low' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                test.status === 'critical' ? 'bg-red-200 text-red-800 border border-red-300' :
                                  'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                            {test.status === 'high' && <TrendingUp size={14} className="mr-1" />}
                            {test.status === 'low' && <TrendingDown size={14} className="mr-1" />}
                            {test.status === 'normal' && <CheckCircle size={14} className="mr-1" />}
                            {test.status?.charAt(0).toUpperCase() + test.status?.slice(1)}
                          </span>
                        )}
                      </div>

                      {test.reference_range && (
                        <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
                          <span className="font-medium">{t(lang, 'referenceRange')}:</span>
                          <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-700 font-medium">{test.reference_range}</span>
                        </div>
                      )}

                      {test.clinical_significance && (
                        <div className="mb-4 bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <Stethoscope size={14} className="text-blue-500" />
                            <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">{t(lang, 'clinicalSignificance')}</p>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{test.clinical_significance}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {test.possible_causes && test.possible_causes.length > 0 && (
                          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <Lightbulb size={14} className="text-amber-600" />
                              <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">{t(lang, 'possibleCauses')}</p>
                            </div>
                            <ul className="space-y-1.5">
                              {test.possible_causes.map((cause, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 flex-shrink-0"></span>
                                  {cause}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {test.possible_symptoms_if_untreated && test.possible_symptoms_if_untreated.length > 0 && (
                          <div className="bg-red-50 rounded-lg p-4 border border-red-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle size={14} className="text-red-600" />
                              <p className="text-xs text-red-700 uppercase tracking-wide font-semibold">{t(lang, 'ifUntreated')}</p>
                            </div>
                            <ul className="space-y-1.5">
                              {test.possible_symptoms_if_untreated.map((symptom, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                                  {symptom}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {test.recommended_next_steps && test.recommended_next_steps.length > 0 && (
                          <div className="bg-green-50 rounded-lg p-4 border border-green-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle size={14} className="text-green-600" />
                              <p className="text-xs text-green-700 uppercase tracking-wide font-semibold">{t(lang, 'nextSteps')}</p>
                            </div>
                            <ul className="space-y-1.5">
                              {test.recommended_next_steps.map((step, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></span>
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Abnormal Summary Section
  const AbnormalSummarySection = () => {
    if (!clinicalAnalysis.abnormal_summary) return null;
    const summary = clinicalAnalysis.abnormal_summary;

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
        <SectionHeader
          icon={ClipboardList}
          title={t(lang, 'testResultsSummary')}
          isExpanded={expandedSections.abnormalSummary}
          onToggle={() => toggleSection('abnormalSummary')}
          gradient="from-teal-50 to-white"
        />

        <AnimatePresence>
          {expandedSections.abnormalSummary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-3 text-center border border-teal-100 shadow-sm">
                    <p className="text-2xl font-bold text-teal-700">{summary.total_tests || 0}</p>
                    <p className="text-[9px] text-teal-600 uppercase tracking-wide mt-0.5">{t(lang, 'totalTests')}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 text-center border border-green-100 shadow-sm">
                    <p className="text-2xl font-bold text-green-700">{summary.normal_tests || 0}</p>
                    <p className="text-[9px] text-green-600 uppercase tracking-wide mt-0.5">{t(lang, 'normal')}</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-3 text-center border border-yellow-100 shadow-sm">
                    <p className="text-2xl font-bold text-yellow-700">{summary.abnormal_tests || 0}</p>
                    <p className="text-[9px] text-yellow-600 uppercase tracking-wide mt-0.5">{t(lang, 'abnormal')}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-3 text-center border border-red-100 shadow-sm">
                    <p className="text-2xl font-bold text-red-700">{summary.critical_tests?.length || 0}</p>
                    <p className="text-[9px] text-red-600 uppercase tracking-wide mt-0.5">{t(lang, 'critical')}</p>
                  </div>
                </div>

                {summary.critical_tests && summary.critical_tests.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Siren size={14} className="text-red-600" />
                      <p className="text-xs text-red-700 font-semibold">{t(lang, 'criticalTestsAttention')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {summary.critical_tests.map((test, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-medium border border-red-200">
                          <AlertCircle size={12} className="mr-1" />
                          {test}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Condition Suspicions Section
  const ConditionSuspicionsSection = () => {
    if (!clinicalAnalysis.condition_suspicions || clinicalAnalysis.condition_suspicions.length === 0) return null;

    const confidenceConfig = {
      high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
      low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    };

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
        <SectionHeader
          icon={HeartPulse}
          title={t(lang, 'possibleConditions')}
          isExpanded={expandedSections.conditionSuspicions}
          onToggle={() => toggleSection('conditionSuspicions')}
          gradient="from-rose-50 to-white"
        />

        <AnimatePresence>
          {expandedSections.conditionSuspicions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      {t(lang, 'conditionsDisclaimer')}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {clinicalAnalysis.condition_suspicions.map((condition, idx) => {
                    const confidence = condition.confidence_level?.toLowerCase() || 'medium';
                    const style = confidenceConfig[confidence] || confidenceConfig.medium;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-3 border border-rose-100 shadow-sm group hover:bg-rose-100 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <h4 className="font-semibold text-slate-900 text-sm">{condition.possible_condition}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                            {condition.confidence_level} {t(lang, 'confidenceLabel')}
                          </span>
                        </div>
                        {condition.reasoning && (
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">{condition.reasoning}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Lifestyle Recommendations Section
  const LifestyleRecommendationsSection = () => {
    if (!clinicalAnalysis.lifestyle_recommendations || clinicalAnalysis.lifestyle_recommendations.length === 0) return null;

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
        <SectionHeader
          icon={Dumbbell}
          title={t(lang, 'lifestyleRecommendations')}
          isExpanded={expandedSections.lifestyleRecommendations}
          onToggle={() => toggleSection('lifestyleRecommendations')}
          gradient="from-emerald-50 to-white"
        />

        <AnimatePresence>
          {expandedSections.lifestyleRecommendations && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white space-y-2">
                {clinicalAnalysis.lifestyle_recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ x: 10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-emerald-50/30 rounded-xl border border-emerald-100 shadow-sm group hover:bg-emerald-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0 border border-emerald-100 group-hover:scale-110 transition-transform">
                      {rec.toLowerCase().includes('diet') || rec.toLowerCase().includes('food') ? <Apple size={16} className="text-emerald-500" /> : <Dumbbell size={16} className="text-emerald-500" />}
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed pt-0.5">{rec}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Medical Recommendations Section
  const MedicalRecommendationsSection = () => {
    if (!clinicalAnalysis.medical_recommendations || clinicalAnalysis.medical_recommendations.length === 0) return null;

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
        <SectionHeader
          icon={BookOpen}
          title={t(lang, 'medicalRecommendations')}
          isExpanded={expandedSections.medicalRecommendations}
          onToggle={() => toggleSection('medicalRecommendations')}
          gradient="from-sky-50 to-white"
        />

        <AnimatePresence>
          {expandedSections.medicalRecommendations && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white space-y-2">
                {clinicalAnalysis.medical_recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-sky-50/30 rounded-xl border border-sky-100 shadow-sm group hover:bg-sky-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0 border border-sky-100 group-hover:scale-110 transition-transform">
                      <Stethoscope size={16} className="text-sky-600" />
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed pt-0.5">{rec}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Clinical Summary Section
  const ClinicalSummarySection = () => {
    const summary = clinicalAnalysis.overall_clinical_summary || clinicalAnalysis.overall_clinical_interpretation;
    if (!summary) return null;

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
        <SectionHeader
          icon={Brain}
          title={t(lang, 'clinicalSummaryTitle')}
          isExpanded={expandedSections.clinicalSummary}
          onToggle={() => toggleSection('clinicalSummary')}
          gradient="from-violet-50 to-white"
        />

        <AnimatePresence>
          {expandedSections.clinicalSummary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-3 bg-white">
                <div className="bg-gradient-to-br from-violet-50/50 to-purple-50/50 rounded-xl p-4 border border-violet-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Brain size={60} className="text-violet-600" />
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium text-sm italic relative z-10">"{summary}"</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Single big card for handwritten prescription: points-wise list, no card per title
  const HandwrittenPrescriptionSingleCard = () => {
    const summary = clinicalAnalysis.overall_clinical_summary || clinicalAnalysis.overall_clinical_interpretation;
    const meds = clinicalAnalysis.medication_analysis || [];
    const hasContent = summary || meds.length > 0;
    if (!hasContent) return null;

    // Helper: one bullet point (label + value)
    const Point = ({ label, value }) => (
      <li className="text-gray-700 text-sm leading-relaxed flex gap-2">
        <span className="text-gray-400 shrink-0">•</span>
        <span><span className="font-medium text-gray-600">{label}:</span> {value}</span>
      </li>
    );

    return (
      <div className="border border-violet-100 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/70 shadow-lg overflow-hidden">
        <div className="p-4 space-y-4">
          {summary && (
            <div className="rounded-xl bg-violet-600/10 border border-violet-200 px-3 py-2">
              <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-900 mb-1">
                <Brain size={14} className="text-violet-600" />
                {t(lang, 'clinicalSummaryTitle')}
              </h4>
              <p className="text-[11px] text-violet-800 leading-relaxed font-medium italic">"{summary}"</p>
            </div>
          )}

          {meds.length > 0 && meds.map((med, idx) => (
            <div
              key={idx}
              className={`rounded-xl border bg-white/85 shadow-sm hover:shadow-md hover:bg-violet-50/60 transition-all p-3 ${idx > 0 ? 'mt-3' : ''
                }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                    <Pill size={16} className="text-violet-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {med.medicine_name}
                    </h4>
                    {med.drug_class && (
                      <p className="text-[10px] text-slate-500 font-medium">
                        {med.drug_class}
                      </p>
                    )}
                  </div>
                </div>
                {med.dosage_instructions && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-sky-500/10 text-sky-800 border border-sky-200 uppercase tracking-tight">
                    {med.dosage_instructions}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <ul className="space-y-1 pl-1">
                  {med.purpose && <Point label={t(lang, 'use')} value={med.purpose} />}
                  {med.patient_friendly_explanation && (
                    <Point label={t(lang, 'useOfMedicine')} value={med.patient_friendly_explanation} />
                  )}
                  {med.condition_treated && (
                    <Point label={t(lang, 'treatedCondition')} value={med.condition_treated} />
                  )}
                  {med.how_it_works && (
                    <Point label={t(lang, 'howItWorks')} value={med.how_it_works} />
                  )}
                  {med.why_prescribed_for_this_case && (
                    <Point label={t(lang, 'reasonForPrescription')} value={med.why_prescribed_for_this_case} />
                  )}
                </ul>

                <ul className="space-y-1 pl-1">
                  {med.duration && (
                    <Point label={t(lang, 'treatmentDuration')} value={med.duration} />
                  )}
                  {med.benefits_if_taken_properly && (
                    <Point label={t(lang, 'expectedBenefits')} value={med.benefits_if_taken_properly} />
                  )}
                  {med.what_happens_if_not_taken && (
                    <Point label={t(lang, 'ifMissedOrNotTaken')} value={med.what_happens_if_not_taken} />
                  )}
                  {med.what_happens_if_stopped_early && (
                    <Point label={t(lang, 'ifDiscontinuedEarly')} value={med.what_happens_if_stopped_early} />
                  )}
                  {med.what_happens_if_overdosed && (
                    <Point label={t(lang, 'inCaseOfOverdose')} value={med.what_happens_if_overdosed} />
                  )}
                </ul>
              </div>

              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                {med.common_side_effects?.length > 0 && (
                  <div className="rounded-lg bg-amber-50/80 border border-amber-200 px-2 py-1.5">
                    <p className="text-[10px] font-bold text-amber-700 mb-1 uppercase tracking-wider">
                      {t(lang, 'commonSideEffects')}
                    </p>
                    <ul className="list-disc list-inside text-amber-800 text-[10px] space-y-0.5 font-medium">
                      {med.common_side_effects.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {med.serious_side_effects?.length > 0 && (
                  <div className="rounded-lg bg-rose-50/85 border border-rose-200 px-2 py-1.5">
                    <p className="text-[10px] font-bold text-rose-700 mb-1 uppercase tracking-wider">
                      {t(lang, 'seriousSideEffects')}
                    </p>
                    <ul className="list-disc list-inside text-rose-800 text-[10px] space-y-0.5 font-medium">
                      {med.serious_side_effects.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                {med.important_warnings?.length > 0 && (
                  <div className="rounded-lg bg-amber-100/60 border border-amber-300 px-2 py-1.5">
                    <p className="text-[10px] font-bold text-amber-800 mb-1 uppercase tracking-wider">
                      {t(lang, 'warnings')}
                    </p>
                    <ul className="list-disc list-inside text-amber-900 text-[10px] space-y-0.5 font-medium">
                      {med.important_warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(med.drug_interactions?.length > 0 || med.interaction_risks?.length > 0) && (
                  <div className="rounded-lg bg-sky-50/80 border border-sky-200 px-2 py-1.5">
                    <p className="text-[10px] font-bold text-sky-800 mb-1 uppercase tracking-wider">
                      {t(lang, 'medicationInteractions')}
                    </p>
                    <ul className="list-disc list-inside text-sky-900 text-[10px] space-y-0.5 font-medium">
                      {med.drug_interactions?.map((it, i) => (
                        <li key={`di-${i}`}>{it}</li>
                      ))}
                      {med.interaction_risks?.map((it, i) => (
                        <li key={`ir-${i}`}>{it}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Single card for scanned report: new format (patient_details, analysis_summary, parameters) — points-wise
  const ScannedReportSingleCard = () => {
    const patient = clinicalAnalysis.patient_details || {};
    const summary = clinicalAnalysis.analysis_summary || {};
    const parameters = clinicalAnalysis.parameters || [];
    const hasPatient = patient.name || patient.age || patient.gender;
    const hasSummary = summary.total_tests || summary.normal || summary.high || summary.low || summary.overall_health_risk;
    const hasContent = hasPatient || hasSummary || parameters.length > 0;
    if (!hasContent) return null;

    const abnormalParameters = parameters.filter((p) => {
      const status = p.status?.toLowerCase();
      return status && status !== 'normal';
    });

    const riskKey = summary.overall_health_risk?.toLowerCase() || '';
    const riskConfig = {
      low: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        chip: 'bg-emerald-500/10 text-emerald-800 border-emerald-300',
      },
      moderate: {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        chip: 'bg-amber-500/10 text-amber-800 border-amber-300',
      },
      high: {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        chip: 'bg-rose-500/10 text-rose-800 border-rose-300',
      },
    };
    const riskStyle = riskConfig[riskKey] || {
      bg: 'bg-slate-50',
      text: 'text-slate-800',
      border: 'border-slate-200',
      chip: 'bg-slate-500/10 text-slate-800 border-slate-300',
    };

    const Point = ({ label, value }) => (
      <li className="text-gray-700 text-sm leading-relaxed flex gap-2">
        <span className="text-gray-400 shrink-0">•</span>
        <span><span className="font-medium text-gray-600">{label}:</span> {value}</span>
      </li>
    );

    return (
      <div className="border border-sky-100 rounded-xl bg-gradient-to-br from-sky-50/70 via-white to-indigo-50/60 shadow-lg overflow-hidden">
        <div className="p-4 space-y-4">
          {hasPatient && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center border border-sky-100">
                  <UserCheck size={16} className="text-sky-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sky-900 text-xs">{t(lang, 'patientDetails')}</h4>
                  <p className="text-[10px] text-sky-700 opacity-80 font-medium">{t(lang, 'labPatientContext')}</p>
                </div>
              </div>
              <ul className="list-none space-y-1 pl-0 text-xs text-sky-900 font-medium pb-2 border-b border-sky-100 md:border-0 md:pb-0">
                {patient.name && <Point label={t(lang, 'name')} value={patient.name} />}
                {patient.age && <Point label={t(lang, 'age')} value={patient.age} />}
                {patient.gender && <Point label={t(lang, 'gender')} value={patient.gender} />}
              </ul>
            </div>
          )}

          {hasSummary && (
            <div className="space-y-3">
              {/* AI Snapshot / Risk summary */}
              <div className={`rounded-xl px-3 py-3 border ${riskStyle.bg} ${riskStyle.border}`}>
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-100/50">
                      <ClipboardList size={14} className="text-sky-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        AI Snapshot
                      </p>
                      <p className="text-[11px] font-bold text-slate-800">
                        Report overview
                      </p>
                    </div>
                  </div>
                  {summary.overall_health_risk && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${riskStyle.chip}`}
                    >
                      Risk:&nbsp;{summary.overall_health_risk}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {summary.total_tests && (
                    <div className="rounded-lg bg-white/70 border border-slate-100 px-2.5 py-1.5 shadow-sm">
                      <p className="text-[9px] uppercase tracking-wide text-slate-500 font-bold">Total</p>
                      <p className="text-sm font-bold text-slate-900">{summary.total_tests}</p>
                    </div>
                  )}
                  {summary.normal && (
                    <div className="rounded-lg bg-emerald-50/80 border border-emerald-100 px-2.5 py-1.5 shadow-sm">
                      <p className="text-[9px] uppercase tracking-wide text-emerald-600 font-bold">Pass</p>
                      <p className="text-sm font-bold text-emerald-900">{summary.normal}</p>
                    </div>
                  )}
                  {summary.high && (
                    <div className="rounded-lg bg-rose-50/80 border border-rose-100 px-2.5 py-1.5 shadow-sm">
                      <p className="text-[9px] uppercase tracking-wide text-rose-600 font-bold">High</p>
                      <p className="text-sm font-bold text-rose-900">{summary.high}</p>
                    </div>
                  )}
                  {summary.low && (
                    <div className="rounded-lg bg-amber-50/80 border border-amber-100 px-2.5 py-1.5 shadow-sm">
                      <p className="text-[9px] uppercase tracking-wide text-amber-600 font-bold">Low</p>
                      <p className="text-sm font-bold text-amber-900">{summary.low}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Alerts / key signals */}
              {abnormalParameters.length > 0 && (
                <div className="rounded-xl bg-amber-50/80 border border-amber-100 p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-200">
                      <BadgeAlert size={14} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-700">Alerts</p>
                      <p className="text-[11px] text-amber-900 font-medium">Critical results detected</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {abnormalParameters.map((param, idx) => {
                      const status = param.status?.toLowerCase();
                      const pillColor =
                        status === 'high'
                          ? 'bg-rose-500/10 text-rose-800 border-rose-300'
                          : status === 'low'
                            ? 'bg-amber-500/10 text-amber-800 border-amber-300'
                            : 'bg-slate-500/10 text-slate-800 border-slate-300';
                      const topAction = param.recommended_actions?.[0];

                      return (
                        <div
                          key={idx}
                          className="rounded-lg bg-white/90 border border-amber-100 px-2.5 py-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{param.test_name}</p>
                            {param.value != null && param.value !== '' && (
                              <p className="text-[10px] text-slate-600 font-medium">
                                <span className="font-bold">Value:</span> {param.value}{param.unit && <span className="ml-0.5">{param.unit}</span>}
                                {param.reference_range && <span className="ml-1.5 opacity-70">(Ref: {param.reference_range})</span>}
                              </p>
                            )}
                          </div>
                          {param.status && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border self-start md:self-auto uppercase tracking-tighter ${pillColor}`}>
                              {param.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {parameters.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 mb-1">
                <Activity size={14} className="text-sky-600" />
                Lab test results
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {parameters.map((param, idx) => {
                  const status = param.status?.toLowerCase();
                  const statusColor =
                    status === 'normal'
                      ? 'bg-emerald-500/10 text-emerald-800 border-emerald-200'
                      : status === 'high'
                        ? 'bg-rose-500/10 text-rose-800 border-rose-200'
                        : status === 'low'
                          ? 'bg-amber-500/10 text-amber-800 border-amber-200'
                          : 'bg-slate-500/10 text-slate-800 border-slate-200';

                  const topAction = param.recommended_actions?.[0];

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-100 bg-white/80 hover:bg-sky-50/70 hover:border-sky-200 transition-all shadow-sm p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate pr-1">{param.test_name}</p>
                        {param.status && (
                          <span className={`inline-flex shrink-0 items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-tighter ${statusColor}`}>
                            {param.status}
                          </span>
                        )}
                      </div>
                      {param.value != null && param.value !== '' && (
                        <p className="text-[10px] text-slate-600 font-medium mb-1">
                          {t(lang, 'value')}: <span className="font-bold text-slate-800">{param.value}</span>{param.unit && <span className="ml-0.5">{param.unit}</span>}
                        </p>
                      )}
                      {param.clinical_meaning && (
                        <p className="text-[10px] text-slate-600 leading-tight line-clamp-2">
                          {param.clinical_meaning}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t(lang, 'aiClinicalAnalysis')}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {clinicalAnalysis.risk_level && (
              <RiskLevelBadge level={clinicalAnalysis.risk_level} />
            )}
            {clinicalAnalysis.urgency_level && (
              <UrgencyBadge
                level={clinicalAnalysis.urgency_level}
                requiresImmediate={clinicalAnalysis.requires_immediate_attention}
              />
            )}
          </div>
        </div>
      </div>

      {/* Immediate Attention Alert */}
      {clinicalAnalysis.requires_immediate_attention && (
        <div className="bg-gradient-to-r from-red-500 to-rose-500 rounded-xl p-4 text-white shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Siren size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base">{t(lang, 'immediateAttentionRequired')}</h3>
              <p className="text-white/90 text-xs mt-0.5">
                {t(lang, 'immediateAttentionMessage')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tabs for Analysis & Diet */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-2">
        <button
          onClick={() => setActiveSubTab('analysis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Activity size={16} />
          {t(lang, 'analysis')}
        </button>
        <button
          onClick={() => setActiveSubTab('diet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'diet' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Apple size={16} />
          {t(lang, 'dietChart')}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'diet' ? (
          <motion.div
            key="diet-chart"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm"
          >
            <DietChartTab dietData={clinicalAnalysis.diet_chart} language={lang} />
          </motion.div>
        ) : (
          <motion.div
            key="analysis-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Handwritten prescription: single big card with all analysis */}
            {documentType === 'handwritten_prescription' && (
              <HandwrittenPrescriptionSingleCard />
            )}

            {/* Scanned report: single card with new format (patient_details, analysis_summary, parameters) */}
            {documentType === 'scanned_report' && (
              <ScannedReportSingleCard />
            )}

            {/* Generic display for other document types */}
            {documentType !== 'handwritten_prescription' && documentType !== 'scanned_report' && (
              <div className="space-y-4">
                <VitalAnalysisSection />
                <DiagnosisAnalysisSection />
                <MedicationAnalysisSection />
                <DrugInteractionsSection />
                <PatientRiskProfileSection />
                <TestAnalysisSection />
                <AbnormalSummarySection />
                <ConditionSuspicionsSection />
                <LifestyleRecommendationsSection />
                <MedicalRecommendationsSection />
                <MissingInfoSection />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ClinicalAnalysisDisplay;
