import { useState } from 'react';
import {
  FileText,
  User,
  Stethoscope,
  Activity,
  Pill,
  Heart,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Calendar,
  Phone,
  MapPin,
  Thermometer,
  Weight,
  Ruler,
  TestTube,
  FileCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Brain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ClinicalAnalysisDisplay from './ClinicalAnalysisDisplay';
import { t } from '../translations/patientReports';

const EnhancedAnalysisResult = ({ result, documentType, language = 'en' }) => {
  const lang = language === 'ta' ? 'ta' : 'en';
  const [expandedSections, setExpandedSections] = useState({
    doctor: true,
    patient: true,
    vitals: false,
    prescription: true,
    medications: true,
    investigations: false,
    labDetails: true,
    testResults: true,
    summary: true,
    // Show extracted raw text by default so patients immediately see everything
    rawText: true,
    clinicalAnalysis: true,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const CompactSectionHeader = ({ icon: Icon, title, isExpanded, onToggle, gradient = "from-slate-50 to-white", color = "text-slate-600" }) => (
    <motion.button
      whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-3 bg-gradient-to-r ${gradient} border-b border-slate-100 transition-colors`}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-100">
          <Icon size={16} className={color} />
        </div>
        <span className="font-bold text-slate-800 text-sm tracking-tight">{title}</span>
      </div>
      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
        <ChevronDown size={16} className="text-slate-400" />
      </motion.div>
    </motion.button>
  );

  if (!result || result.error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-red-700 text-sm">{result?.message || t(lang, 'analysisFailed')}</p>
        </div>
      </div>
    );
  }

  // Document Type Badge
  const DocumentTypeBadge = () => {
    const config = {
      handwritten_prescription: {
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        labelKey: 'handwrittenPrescription',
        icon: Stethoscope,
      },
      scanned_report: {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        labelKey: 'scannedReport',
        icon: FileCheck,
      },
      other: {
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        labelKey: 'otherDocument',
        icon: FileText,
      },
    };

    const { color, labelKey, icon: Icon } = config[documentType] || config.other;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
        <Icon size={14} />
        {t(lang, labelKey)}
      </span>
    );
  };

  // Confidence Score Badge
  const ConfidenceBadge = ({ score }) => {
    const config = {
      high: 'bg-green-100 text-green-700 border-green-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-red-100 text-red-700 border-red-200',
    };

    const color = config[score?.toLowerCase()] || config.medium;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
        {t(lang, 'confidence')}: {score || t(lang, 'unknown')}
      </span>
    );
  };

  // Handwritten Prescription Display
  const HandwrittenPrescriptionView = () => (
    <div className="space-y-4">
      {/* Doctor Details */}
      {result.doctor_details && (
        <div className="border border-purple-100 rounded-2xl overflow-hidden shadow-sm bg-white">
          <CompactSectionHeader
            icon={Stethoscope}
            title={t(lang, 'doctorDetails')}
            isExpanded={expandedSections.doctor}
            onToggle={() => toggleSection('doctor')}
            gradient="from-purple-50 to-white"
            color="text-purple-600"
          />

          <AnimatePresence>
            {expandedSections.doctor && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-purple-50">
                  {result.doctor_details.name && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-purple-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-purple-400">{t(lang, 'name')}</p>
                        <p className="text-sm font-semibold text-purple-900">{result.doctor_details.name}</p>
                      </div>
                    </div>
                  )}
                  {result.doctor_details.qualification && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <FileCheck size={14} className="text-purple-500" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-purple-400">{t(lang, 'qualification')}</p>
                        <p className="text-sm font-semibold text-purple-900">{result.doctor_details.qualification}</p>
                      </div>
                    </div>
                  )}
                  {result.doctor_details.registration_number && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Info size={14} className="text-purple-500" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-purple-400">{t(lang, 'registrationNo')}</p>
                        <p className="text-sm font-semibold text-purple-900">{result.doctor_details.registration_number}</p>
                      </div>
                    </div>
                  )}
                  {result.doctor_details.hospital_or_clinic && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <MapPin size={14} className="text-purple-500" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-purple-400">{t(lang, 'hospitalClinic')}</p>
                        <p className="text-sm font-semibold text-purple-900">{result.doctor_details.hospital_or_clinic}</p>
                      </div>
                    </div>
                  )}
                  {result.doctor_details.contact && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Phone size={14} className="text-purple-500" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-purple-400">{t(lang, 'contact')}</p>
                        <p className="text-sm font-semibold text-purple-900">{result.doctor_details.contact}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Patient Details */}
      {result.patient_details && (
        <div className="border border-blue-100 rounded-2xl overflow-hidden shadow-sm bg-white">
          <CompactSectionHeader
            icon={User}
            title={t(lang, 'patientDetails')}
            isExpanded={expandedSections.patient}
            onToggle={() => toggleSection('patient')}
            gradient="from-blue-50 to-white"
            color="text-blue-600"
          />

          <AnimatePresence>
            {expandedSections.patient && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-blue-50">
                  {result.patient_details.name && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-blue-400">{t(lang, 'name')}</p>
                        <p className="text-sm font-semibold text-blue-900">{result.patient_details.name}</p>
                      </div>
                    </div>
                  )}
                  {result.patient_details.age && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Clock size={12} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-blue-400">{t(lang, 'age')}</p>
                        <p className="text-sm font-semibold text-blue-900">{result.patient_details.age}</p>
                      </div>
                    </div>
                  )}
                  {result.patient_details.gender && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-blue-400">{t(lang, 'gender')}</p>
                        <p className="text-sm font-semibold text-blue-900">{result.patient_details.gender}</p>
                      </div>
                    </div>
                  )}
                  {result.patient_details.blood_group && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Heart size={12} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-blue-400">{t(lang, 'bloodGroup')}</p>
                        <p className="text-sm font-semibold text-blue-900">{result.patient_details.blood_group}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Vitals */}
      {result.vitals && Object.values(result.vitals).some(val => val) && (
        <div className="border border-green-200 rounded-xl overflow-hidden">
          <CompactSectionHeader
            icon={Heart}
            title={t(lang, 'vitals')}
            isExpanded={expandedSections.vitals}
            onToggle={() => toggleSection('vitals')}
            gradient="from-green-50 to-white"
            color="text-green-600"
          />

          {expandedSections.vitals && (
            <div className="p-3 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.vitals.temperature && (
                  <div className="flex items-center gap-2">
                    <Thermometer size={14} className="text-green-500" />
                    <div>
                      <p className="text-xs text-green-600">{t(lang, 'temperature')}</p>
                      <p className="text-sm font-medium text-green-900">{result.vitals.temperature}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prescription Details */}
      {result.prescription_details && (
        <div className="border border-indigo-200 rounded-xl overflow-hidden">
          <CompactSectionHeader
            icon={FileText}
            title={t(lang, 'prescriptionDetails')}
            isExpanded={expandedSections.prescription}
            onToggle={() => toggleSection('prescription')}
            gradient="from-indigo-50 to-white"
            color="text-indigo-600"
          />

          {expandedSections.prescription && (
            <div className="p-3 bg-white space-y-3">
              {result.prescription_details.date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-500" />
                  <div>
                    <p className="text-xs text-indigo-600">{t(lang, 'date')}</p>
                    <p className="text-sm font-medium text-indigo-900">{result.prescription_details.date}</p>
                  </div>
                </div>
              )}
              {result.prescription_details.diagnosis && (
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-indigo-500" />
                  <div>
                    <p className="text-xs text-indigo-600">{t(lang, 'diagnosis')}</p>
                    <p className="text-sm font-medium text-indigo-900">{result.prescription_details.diagnosis}</p>
                  </div>
                </div>
              )}
              {result.prescription_details.chief_complaint && (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-indigo-500" />
                  <div>
                    <p className="text-xs text-indigo-600">{t(lang, 'chiefComplaint')}</p>
                    <p className="text-sm font-medium text-indigo-900">{result.prescription_details.chief_complaint}</p>
                  </div>
                </div>
              )}
              {result.prescription_details.notes && (
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-indigo-500" />
                  <div>
                    <p className="text-xs text-indigo-600">{t(lang, 'notes')}</p>
                    <p className="text-sm font-medium text-indigo-900">{result.prescription_details.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Medications */}
      {result.medications && result.medications.length > 0 && (
        <div className="border border-amber-100 rounded-2xl overflow-hidden shadow-sm bg-white">
          <CompactSectionHeader
            icon={Pill}
            title={`${t(lang, 'medications')} (${result.medications.length})`}
            isExpanded={expandedSections.medications}
            onToggle={() => toggleSection('medications')}
            gradient="from-amber-50 to-white"
            color="text-amber-600"
          />

          <AnimatePresence>
            {expandedSections.medications && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-3 border-t border-amber-50 space-y-3">
                  {result.medications.map((med, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                      <div className="flex items-start justify-between mb-2 relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-50 rounded-lg shadow-sm flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform">
                            <Pill size={16} className="text-orange-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{med.medicine_name}</h4>
                            <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">{med.id || `MED-${idx + 1}`}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative z-10">
                        {med.dosage && (
                          <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                            <p className="text-[9px] text-orange-400 uppercase tracking-wider font-bold mb-0.5">{t(lang, 'dosage')}</p>
                            <p className="text-xs font-bold text-slate-700">{med.dosage}</p>
                          </div>
                        )}
                        {med.frequency && (
                          <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                            <p className="text-[9px] text-orange-400 uppercase tracking-wider font-bold mb-0.5">{t(lang, 'frequency')}</p>
                            <p className="text-xs font-bold text-slate-700">{med.frequency}</p>
                          </div>
                        )}
                        {med.duration && (
                          <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                            <p className="text-[9px] text-orange-400 uppercase tracking-wider font-bold mb-0.5">{t(lang, 'duration')}</p>
                            <p className="text-xs font-bold text-slate-700">{med.duration}</p>
                          </div>
                        )}
                        {med.route && (
                          <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                            <p className="text-[9px] text-orange-400 uppercase tracking-wider font-bold mb-0.5">{t(lang, 'route')}</p>
                            <p className="text-xs font-bold text-slate-700">{med.route}</p>
                          </div>
                        )}
                      </div>

                      {med.instructions && (
                        <div className="mt-2 bg-slate-50/50 rounded-lg p-2 border border-slate-100 relative z-10">
                          <p className="text-[9px] text-orange-400 uppercase tracking-wider font-bold mb-0.5">{t(lang, 'instructions')}</p>
                          <p className="text-xs text-slate-700 italic font-medium leading-relaxed">"{med.instructions}"</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Follow-up & Lifestyle */}
      {(result.follow_up || result.lifestyle_advice || result.additional_notes) && (
        <div className="border border-teal-200 rounded-xl overflow-hidden">
          <CompactSectionHeader
            icon={Info}
            title={t(lang, 'additionalInfo')}
            isExpanded={expandedSections.investigations}
            onToggle={() => toggleSection('investigations')}
            gradient="from-teal-50 to-white"
            color="text-teal-600"
          />

          {expandedSections.investigations && (
            <div className="p-3 bg-white space-y-3">
              {result.follow_up && (
                <div>
                  <p className="text-xs text-teal-600 mb-1 font-medium">{t(lang, 'followUp')}</p>
                  <p className="text-sm text-teal-900">{result.follow_up}</p>
                </div>
              )}
              {result.lifestyle_advice && (
                <div>
                  <p className="text-xs text-teal-600 mb-1 font-medium">{t(lang, 'lifestyleAdvice')}</p>
                  <p className="text-sm text-teal-900">{result.lifestyle_advice}</p>
                </div>
              )}
              {result.additional_notes && (
                <div>
                  <p className="text-xs text-teal-600 mb-1 font-medium">{t(lang, 'additionalNotes')}</p>
                  <p className="text-sm text-teal-900">{result.additional_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Scanned Report Display
  const ScannedReportView = () => (
    <div className="space-y-4">
      {/* Lab Details */}
      {result.lab_details && (
        <div className="border border-blue-200 rounded-xl overflow-hidden">
          <CompactSectionHeader
            icon={TestTube}
            title={t(lang, 'labDetails')}
            isExpanded={expandedSections.labDetails}
            onToggle={() => toggleSection('labDetails')}
            gradient="from-blue-50 to-white"
            color="text-blue-600"
          />

          {expandedSections.labDetails && (
            <div className="p-3 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.lab_details.lab_name && (
                  <div className="flex items-center gap-2">
                    <FileCheck size={14} className="text-blue-500" />
                    <div>
                      <p className="text-xs text-blue-600">{t(lang, 'labName')}</p>
                      <p className="text-sm font-medium text-blue-900">{result.lab_details.lab_name}</p>
                    </div>
                  </div>
                )}
                {result.lab_details.lab_address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-blue-500" />
                    <div>
                      <p className="text-xs text-blue-600">{t(lang, 'labAddress')}</p>
                      <p className="text-sm font-medium text-blue-900">{result.lab_details.lab_address}</p>
                    </div>
                  </div>
                )}
                {result.lab_details.report_id && (
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-blue-500" />
                    <div>
                      <p className="text-xs text-blue-600">{t(lang, 'reportId')}</p>
                      <p className="text-sm font-medium text-blue-900">{result.lab_details.report_id}</p>
                    </div>
                  </div>
                )}
                {result.lab_details.report_date && (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" />
                    <div>
                      <p className="text-xs text-blue-600">{t(lang, 'reportDate')}</p>
                      <p className="text-sm font-medium text-blue-900">{result.lab_details.report_date}</p>
                    </div>
                  </div>
                )}
                {result.lab_details.sample_collection_date && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-500" />
                    <div>
                      <p className="text-xs text-blue-600">{t(lang, 'sampleCollectionDate')}</p>
                      <p className="text-sm font-medium text-blue-900">{result.lab_details.sample_collection_date}</p>
                    </div>
                  </div>
                )}
                {result.lab_details.doctor_name && (
                  <div className="flex items-center gap-2">
                    <Stethoscope size={16} className="text-blue-500" />
                    <div>
                      <p className="text-xs text-blue-600">{t(lang, 'doctorName')}</p>
                      <p className="text-sm font-medium text-blue-900">{result.lab_details.doctor_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patient Details for Lab Report */}
      {result.patient_details && (
        <div className="border border-green-200 rounded-xl overflow-hidden">
          <CompactSectionHeader
            icon={User}
            title={t(lang, 'patientDetails')}
            isExpanded={expandedSections.patient}
            onToggle={() => toggleSection('patient')}
            gradient="from-green-50 to-white"
            color="text-green-600"
          />

          <AnimatePresence>
            {expandedSections.patient && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-3 bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-green-50">
                  {result.patient_details.name && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-green-400">{t(lang, 'name')}</p>
                        <p className="text-sm font-semibold text-green-900">{result.patient_details.name}</p>
                      </div>
                    </div>
                  )}
                  {result.patient_details.age && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Clock size={12} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-green-400">{t(lang, 'age')}</p>
                        <p className="text-sm font-semibold text-green-900">{result.patient_details.age}</p>
                      </div>
                    </div>
                  )}
                  {result.patient_details.gender && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-green-400">{t(lang, 'gender')}</p>
                        <p className="text-sm font-semibold text-green-900">{result.patient_details.gender}</p>
                      </div>
                    </div>
                  )}
                  {result.patient_details.patient_id && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Info size={12} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-green-400">{t(lang, 'patientId')}</p>
                        <p className="text-sm font-semibold text-green-900">{result.patient_details.patient_id}</p>
                      </div>
                    </div>
                  )}
                  {result.patient_details.date_of_birth && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Calendar size={12} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-green-400">{t(lang, 'dateOfBirth')}</p>
                        <p className="text-sm font-semibold text-green-900">{result.patient_details.date_of_birth}</p>
                      </div>
                    </div>
                  )}
                  {result.patient_details.weight_kg && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Weight size={12} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-green-400">Weight</p>
                        <p className="text-sm font-semibold text-green-900">{result.patient_details.weight_kg} kg</p>
                      </div>
                    </div>
                  )}
                  {result.patient_details.height_cm && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Ruler size={12} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-green-400">{t(lang, 'height')}</p>
                        <p className="text-sm font-semibold text-green-900">{result.patient_details.height_cm} cm</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Test Results */}
      {result.test_results && result.test_results.length > 0 && (
        <div className="border border-purple-100 rounded-2xl overflow-hidden shadow-sm bg-white mt-4">
          <CompactSectionHeader
            icon={Activity}
            title={`${t(lang, 'testResults')} (${result.test_results.length})`}
            isExpanded={expandedSections.testResults}
            onToggle={() => toggleSection('testResults')}
            gradient="from-purple-50 to-white"
            color="text-purple-600"
          />

          <AnimatePresence>
            {expandedSections.testResults && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-0 border-t border-purple-50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-purple-50/50">
                          <th className="text-left px-5 py-3 text-[10px] uppercase font-bold text-purple-400 tracking-wider">Test Name</th>
                          <th className="text-left px-5 py-3 text-[10px] uppercase font-bold text-purple-400 tracking-wider">Result</th>
                          <th className="text-left px-5 py-3 text-[10px] uppercase font-bold text-purple-400 tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50">
                        {result.test_results.map((test, idx) => (
                          <motion.tr
                            key={idx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group hover:bg-purple-50/30 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <p className="font-bold text-purple-900">{test.test_name}</p>
                              {test.test_category && <p className="text-[10px] text-purple-400 uppercase font-semibold">{test.test_category}</p>}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-slate-800">
                                {test.result_value} <span className="text-xs font-normal text-slate-400">{test.unit}</span>
                              </p>
                              {test.reference_range && <p className="text-[10px] text-slate-400 font-medium">Ref: {test.reference_range}</p>}
                            </td>
                            <td className="px-5 py-4 text-left">
                              <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${test.status?.toLowerCase() === 'normal' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                test.status?.toLowerCase() === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                  test.status?.toLowerCase() === 'low' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    test.status?.toLowerCase() === 'critical' ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse' :
                                      'bg-slate-50 text-slate-600 border-slate-100'
                                }`}>
                                {test.status || '-'}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Summary and Recommendations */}
      {(result.overall_summary || result.recommendations || result.critical_flags?.length > 0) && (
        <div className="border border-indigo-100 rounded-2xl overflow-hidden shadow-sm bg-white mt-6">
          <CompactSectionHeader
            icon={Info}
            title={t(lang, 'summaryRecommendations')}
            isExpanded={expandedSections.summary}
            onToggle={() => toggleSection('summary')}
            gradient="from-indigo-50 to-white"
            color="text-indigo-600"
          />

          <AnimatePresence>
            {expandedSections.summary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-5 bg-white border-t border-indigo-50 space-y-5">
                  {result.critical_flags && result.critical_flags.length > 0 && (
                    <motion.div
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="text-red-500" size={18} />
                        <p className="text-red-800 text-sm font-bold uppercase tracking-wide">{t(lang, 'criticalFlags')}</p>
                      </div>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {result.critical_flags.map((flag, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-red-700 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {result.overall_summary && (
                    <div>
                      <p className="text-indigo-600 text-[10px] uppercase tracking-wider font-bold mb-3">{t(lang, 'overallSummary')}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.overall_summary
                          .split(/[\.\n]+/)
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .slice(0, 6)
                          .map((line, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50"
                            >
                              <p className="text-sm text-indigo-900 leading-relaxed">
                                {line}
                              </p>
                            </motion.div>
                          ))}
                      </div>
                    </div>
                  )}

                  {result.recommendations && (
                    <div>
                      <p className="text-indigo-600 text-[10px] uppercase tracking-wider font-bold mb-3">{t(lang, 'recommendations')}</p>
                      <ul className="space-y-2">
                        {result.recommendations
                          .split(/[\.\n]+/)
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .slice(0, 4)
                          .map((line, idx) => (
                            <motion.li
                              key={idx}
                              initial={{ opacity: 0, x: 5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-start gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50"
                            >
                              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <CheckCircle size={12} className="text-emerald-600" />
                              </div>
                              <span className="text-sm text-emerald-900 leading-relaxed font-medium">{line}</span>
                            </motion.li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with Document Type and Confidence */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <div className="flex items-center gap-3">
          <DocumentTypeBadge />
          {result.confidence_score && <ConfidenceBadge score={result.confidence_score} />}
        </div>
        {result.document_detection && (
          <div className="text-right">
            <p className="text-xs text-gray-600">{t(lang, 'detectionConfidence')}</p>
            <p className="text-sm font-medium text-gray-800">{result.document_detection.confidence_score}</p>
          </div>
        )}
      </div>

      {/* Render appropriate view based on document type */}
      {documentType === 'handwritten_prescription' ? (
        <HandwrittenPrescriptionView />
      ) : documentType === 'scanned_report' ? (
        <ScannedReportView />
      ) : null}

      {/* Clinical Analysis Section - OpenRouter AI Analysis */}
      {result.clinical_analysis && (
        <div className="border border-purple-200 rounded-xl overflow-hidden mt-6">
          <CompactSectionHeader
            icon={Brain}
            title="AI Clinical Intelligence Analysis"
            isExpanded={expandedSections.clinicalAnalysis}
            onToggle={() => toggleSection('clinicalAnalysis')}
            gradient="from-purple-50 to-indigo-50"
            color="text-purple-600"
          />

          {expandedSections.clinicalAnalysis && (
            <div className="p-4 bg-white">
              <ClinicalAnalysisDisplay
                clinicalAnalysis={result.clinical_analysis}
                documentType={documentType}
                language={lang}
              />
            </div>
          )}
        </div>
      )}

      {/* Raw Text Section */}
      {result.raw_text && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <CompactSectionHeader
            icon={FileText}
            title={t(lang, 'rawExtractedText')}
            isExpanded={expandedSections.rawText}
            onToggle={() => toggleSection('rawText')}
            gradient="from-gray-50 to-white"
            color="text-gray-600"
          />

          {expandedSections.rawText && (
            <div className="p-4 bg-white">
              <div className="text-xs text-gray-500 mb-2">
                Highlighted below is the exact text the AI engine could read from your document.
              </div>
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                {result.raw_text}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedAnalysisResult;
