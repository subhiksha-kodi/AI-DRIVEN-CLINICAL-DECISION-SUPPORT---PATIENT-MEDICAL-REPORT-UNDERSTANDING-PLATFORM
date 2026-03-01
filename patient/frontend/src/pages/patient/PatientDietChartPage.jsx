import { useState, useEffect } from 'react';
import { Apple, Calendar, FileText, ChevronRight, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import patientApi from '../../api/patientAxios';
import toast from 'react-hot-toast';
import DietChartTab from '../../components/DietChartTab';
import { t } from '../../translations/patientReports';

const PatientDietChartPage = () => {
    const [reportsWithDiet, setReportsWithDiet] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [preferredLanguage, setPreferredLanguage] = useState(() => {
        return localStorage.getItem('patient_preferred_language') || 'en';
    });

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                const { data } = await patientApi.get('/patient/reports', {
                    params: { limit: 50 }, // Fetch a good number to find reports with analysis
                });

                // Filter reports that have clinical analysis and a diet chart
                const analyzed = data.data.filter(report => {
                    const analysis = report.analysis_result?.clinical_analysis;
                    return analysis && analysis.diet_chart && analysis.diet_chart.length > 0;
                });

                setReportsWithDiet(analyzed);
                if (analyzed.length > 0) {
                    setSelectedReportId(analyzed[0].id);
                }
            } catch (err) {
                toast.error('Failed to fetch diet charts');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const selectedReport = reportsWithDiet.find(r => r.id === selectedReportId);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (reportsWithDiet.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center max-w-2xl mx-auto mt-8">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                    <Apple size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">No Diet Charts Found</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    Your personalized diet charts are generated after analyzing your medical reports or prescriptions.
                    Upload and analyze a report in the <span className="font-bold text-sky-600 italic">Report Analysis</span> tab to get started.
                </p>
                <button
                    onClick={() => window.location.href = '/patient/reports'}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200"
                >
                    Go to Report Analysis
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header Area */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold flex items-center gap-3">
                            <Apple size={36} className="text-emerald-300" />
                            Nutritional Wellness
                        </h1>
                        <p className="text-emerald-50/80 text-lg max-w-lg">
                            AI-driven dietary recommendations tailored to your medical history and current medications.
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                                <Calendar size={24} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Last Updated</p>
                                <p className="text-white font-bold text-lg">
                                    {new Date(reportsWithDiet[0].created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Abstract background shapes */}
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -left-10 -top-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar: History Selection */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-slate-800 font-bold px-1 flex items-center gap-2">
                        <FileText size={18} className="text-slate-400" />
                        Analysis History
                    </h3>
                    <div className="space-y-2">
                        {reportsWithDiet.map((report) => (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReportId(report.id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedReportId === report.id
                                        ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
                                        : 'bg-white/50 border-slate-200 hover:border-emerald-300 hover:bg-white'
                                    }`}
                            >
                                <p className={`font-bold text-sm truncate ${selectedReportId === report.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                                    {report.original_filename}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        {new Date(report.created_at).toLocaleDateString()}
                                    </span>
                                    {selectedReportId === report.id && (
                                        <span className="ml-auto w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                            <ChevronRight size={10} />
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content: Diet Chart View */}
                <div className="lg:col-span-3">
                    <AnimatePresence mode="wait">
                        {selectedReport && (
                            <motion.div
                                key={selectedReport.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                {/* Context Header */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-inner">
                                            <Activity size={24} className="text-sky-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-slate-900 font-bold text-lg">Active Diet Plan</h4>
                                            <p className="text-slate-500 text-sm">Derived from {selectedReport.document_type?.replace('_', ' ')} analysis</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                                        <Info size={16} className="text-amber-500" />
                                        <p className="text-amber-800 text-xs font-medium">Valid until next clinical evaluation</p>
                                    </div>
                                </div>

                                {/* The Diet Chart Tab Component */}
                                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                                    <DietChartTab
                                        dietData={selectedReport.analysis_result.clinical_analysis.diet_chart}
                                        language={preferredLanguage}
                                    />

                                    {/* Watermark/Brand hint */}
                                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between opacity-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span>Generated by ClinicalIQ AI</span>
                                        <span>Consult your doctor before drastic changes</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default PatientDietChartPage;
