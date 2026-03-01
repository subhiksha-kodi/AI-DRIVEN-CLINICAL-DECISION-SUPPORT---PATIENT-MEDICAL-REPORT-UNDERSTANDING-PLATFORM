import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Search,
  RefreshCw,
  X,
  FileImage,
  FileSpreadsheet,
  File,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Pill,
  Activity,
  Heart,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import patientApi from '../../api/patientAxios';
import toast from 'react-hot-toast';
import EnhancedAnalysisResult from '../../components/EnhancedAnalysisResult';
import { patientReportsTranslations, t } from '../../translations/patientReports';

// File type icon mapping
const getFileIcon = (type) => {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const docTypes = ['pdf', 'doc', 'docx'];
  const spreadsheetTypes = ['csv', 'xls', 'xlsx'];

  if (imageTypes.includes(type?.toLowerCase())) return FileImage;
  if (docTypes.includes(type?.toLowerCase())) return FileText;
  if (spreadsheetTypes.includes(type?.toLowerCase())) return FileSpreadsheet;
  return File;
};

// Status badge component
const StatusBadge = ({ status, lang = 'en' }) => {
  const config = {
    pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, labelKey: 'statusPending' },
    processing: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: RefreshCw, labelKey: 'statusAnalyzing' },
    completed: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, labelKey: 'statusAnalyzed' },
    failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle, labelKey: 'statusFailed' },
  };
  const { color, icon: Icon, labelKey } = config[status] || config.pending;
  const label = t(lang, labelKey);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      <Icon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
};

// Severity badge
const SeverityBadge = ({ severity }) => {
  const config = {
    mild: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    moderate: 'bg-orange-100 text-orange-700 border-orange-200',
    severe: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config[severity] || config.mild}`}>
      {severity?.charAt(0).toUpperCase() + severity?.slice(1)}
    </span>
  );
};

// Risk level badge
const RiskBadge = ({ level }) => {
  const config = {
    low: 'bg-green-100 text-green-700 border-green-200',
    moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200',
    insufficient_data: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const label = level === 'insufficient_data' ? 'Insufficient Data' : level?.charAt(0).toUpperCase() + level?.slice(1);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config[level] || config.low}`}>
      {label}
    </span>
  );
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Analysis Result Component
const AnalysisResult = ({ result }) => {
  const [expandedSections, setExpandedSections] = useState({
    extraction: true,
    interactions: false,
    risk: false,
    summary: true,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!result || result.error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-red-700 text-sm">{result?.message || 'Analysis failed'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Patient Summary */}
      {result.patient_summary && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info size={16} className="text-sky-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sky-900 mb-1">Patient Summary</h4>
              <p className="text-sky-800 text-sm leading-relaxed">{result.patient_summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Section */}
      {result.extraction && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('extraction')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-slate-600" />
              <span className="font-semibold text-slate-800">Extracted Information</span>
              <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                {result.extraction.document_type}
              </span>
            </div>
            {expandedSections.extraction ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {expandedSections.extraction && (
            <div className="p-4 space-y-4">
              {/* Medications */}
              {result.extraction.medications?.length > 0 && (
                <div>
                  <h5 className="flex items-center gap-2 font-medium text-slate-700 mb-2">
                    <Pill size={16} className="text-purple-500" />
                    Medications
                  </h5>
                  <div className="space-y-2">
                    {result.extraction.medications.map((med, idx) => (
                      <div key={idx} className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                        <p className="font-medium text-purple-900">{med.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-purple-700">
                          {med.dosage && <span className="bg-purple-100 px-2 py-0.5 rounded">{med.dosage}</span>}
                          {med.frequency && <span className="bg-purple-100 px-2 py-0.5 rounded">{med.frequency}</span>}
                          {med.duration && <span className="bg-purple-100 px-2 py-0.5 rounded">{med.duration}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lab Tests */}
              {result.extraction.lab_tests?.length > 0 && (
                <div>
                  <h5 className="flex items-center gap-2 font-medium text-slate-700 mb-2">
                    <Activity size={16} className="text-blue-500" />
                    Lab Tests
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left px-3 py-2 text-slate-600 font-medium">Test</th>
                          <th className="text-left px-3 py-2 text-slate-600 font-medium">Value</th>
                          <th className="text-left px-3 py-2 text-slate-600 font-medium">Unit</th>
                          <th className="text-left px-3 py-2 text-slate-600 font-medium">Reference</th>
                          <th className="text-left px-3 py-2 text-slate-600 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.extraction.lab_tests.map((test, idx) => (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-800">{test.test_name}</td>
                            <td className="px-3 py-2 text-slate-700">{test.value}</td>
                            <td className="px-3 py-2 text-slate-600">{test.unit}</td>
                            <td className="px-3 py-2 text-slate-500">{test.reference_range || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${test.status === 'normal' ? 'bg-green-100 text-green-700' :
                                  test.status === 'high' ? 'bg-red-100 text-red-700' :
                                    test.status === 'low' ? 'bg-yellow-100 text-yellow-700' :
                                      test.status === 'critical' ? 'bg-red-200 text-red-800' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                {test.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unclear Items */}
              {result.extraction.unclear_items?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm font-medium mb-1">Unclear Items</p>
                  <ul className="list-disc list-inside text-yellow-700 text-sm">
                    {result.extraction.unclear_items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drug Interactions */}
      {result.interactions?.has_interactions && (
        <div className="border border-orange-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('interactions')}
            className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-600" />
              <span className="font-semibold text-orange-800">Drug Interactions Detected</span>
            </div>
            {expandedSections.interactions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {expandedSections.interactions && (
            <div className="p-4 space-y-3">
              {result.interactions.interactions.map((interaction, idx) => (
                <div key={idx} className="bg-white border border-orange-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800">
                      {interaction.drugs?.join(' + ')}
                    </span>
                    <SeverityBadge severity={interaction.severity} />
                  </div>
                  <p className="text-slate-600 text-sm">{interaction.description}</p>
                  {interaction.guideline_reference && (
                    <p className="text-slate-500 text-xs mt-2 italic">
                      Reference: {interaction.guideline_reference}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Risk Assessment */}
      {result.risk_assessment && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('risk')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-red-500" />
              <span className="font-semibold text-slate-800">Risk Assessment</span>
              <RiskBadge level={result.risk_assessment.cardiovascular_risk} />
            </div>
            {expandedSections.risk ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {expandedSections.risk && (
            <div className="p-4 space-y-3">
              {result.risk_assessment.risk_percentage && (
                <p className="text-slate-700">
                  <span className="font-medium">Estimated Risk:</span> {result.risk_assessment.risk_percentage}
                </p>
              )}
              {result.risk_assessment.risk_factors?.length > 0 && (
                <div>
                  <p className="font-medium text-slate-700 mb-1">Risk Factors:</p>
                  <ul className="list-disc list-inside text-slate-600 text-sm">
                    {result.risk_assessment.risk_factors.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.risk_assessment.notes && (
                <p className="text-slate-600 text-sm">{result.risk_assessment.notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disclaimers */}
      {result.disclaimers?.length > 0 && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-3">
          <p className="text-slate-600 text-xs">
            <strong>Disclaimer:</strong> {result.disclaimers.join(' ')}
          </p>
        </div>
      )}
    </div>
  );
};

const PatientReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [deleteModal, setDeleteModal] = useState({ open: false, report: null });
  const [expandedReport, setExpandedReport] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState(() => {
    return localStorage.getItem('patient_preferred_language') || 'en';
  });
  const fileInputRef = useRef(null);

  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await patientApi.get('/patient/reports', {
        params: { page, limit: 10, search: search || undefined },
      });
      setReports(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReports(1);
  };

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        await patientApi.post('/patient/reports/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        successCount++;
      } catch (err) {
        failCount++;
        console.error('Upload failed for:', file.name, err);
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
      fetchReports(1);
    }
    if (failCount > 0) {
      toast.error(`${failCount} file(s) failed to upload`);
    }
  };

  const handleFileSelect = (e) => {
    handleUpload(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleAnalyze = async (report) => {
    setAnalyzingId(report.id);
    try {
      // Include language parameter in the request
      const language = preferredLanguage === 'ta' ? 'ta' : 'en';
      const { data } = await patientApi.post(`/patient/reports/${report.id}/enhanced-analyze?language=${language}`);
      toast.success(preferredLanguage === 'ta' ? 'மேம்பட்ட பகுப்பாய்வு முடிந்தது!' : 'Enhanced analysis completed!');

      // Update report in list
      setReports(prev => prev.map(r =>
        r.id === report.id
          ? { ...r, analysis_status: data.data.analysis_status, analysis_result: data.data.analysis_result, document_type: data.data.document_type }
          : r
      ));

      // Expand report to show results
      setExpandedReport(report.id);
    } catch (err) {
      toast.error(err.response?.data?.message || (preferredLanguage === 'ta' ? 'மேம்பட்ட பகுப்பாய்வு தோல்வியடைந்தது' : 'Enhanced analysis failed'));
      // Refresh to get the failed status
      fetchReports(pagination.page);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleLanguageChange = (lang) => {
    setPreferredLanguage(lang);
    localStorage.setItem('patient_preferred_language', lang);
    toast.success(lang === 'ta' ? 'மொழி தமிழாக மாற்றப்பட்டது' : 'Language changed to English');
  };

  const handleDelete = async () => {
    if (!deleteModal.report) return;

    try {
      await patientApi.delete(`/patient/reports/${deleteModal.report.id}`);
      toast.success('Report deleted successfully');
      setDeleteModal({ open: false, report: null });
      fetchReports(pagination.page);
    } catch (err) {
      toast.error('Failed to delete report');
    }
  };

  const handleDownload = async (report) => {
    try {
      const response = await patientApi.get(`/patient/reports/${report.id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', report.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  const toggleExpand = (reportId) => {
    setExpandedReport(prev => prev === reportId ? null : reportId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t(preferredLanguage, 'pageTitle')}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <span className="text-xs text-slate-500 font-medium">{t(preferredLanguage, 'language')}:</span>
            <select
              value={preferredLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-sm font-medium text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-sky-600/20"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t(preferredLanguage, 'uploading')}
              </>
            ) : (
              <>
                <Upload size={18} />
                {t(preferredLanguage, 'uploadFiles')}
              </>
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragActive
            ? 'border-sky-500 bg-sky-500/10'
            : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50'
          }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${dragActive ? 'bg-sky-500/20' : 'bg-slate-100'
            }`}>
            <Upload size={24} className={dragActive ? 'text-sky-600' : 'text-slate-500'} />
          </div>
          <div>
            <p className="text-slate-700 font-medium">
              {dragActive ? t(preferredLanguage, 'dropFilesHere') : t(preferredLanguage, 'dragDropFiles')}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {t(preferredLanguage, 'orClickBrowse')}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(preferredLanguage, 'searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors text-sm"
          >
            {t(preferredLanguage, 'search')}
          </button>
          <button
            type="button"
            onClick={() => fetchReports(1)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </form>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <FileText size={48} className="text-slate-300 mb-3" />
            <p className="font-medium">{t(preferredLanguage, 'noReportsFound')}</p>
            <p className="text-sm mt-1">{t(preferredLanguage, 'uploadFirstReport')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((report) => {
              const FileIcon = getFileIcon(report.file_type);
              const isExpanded = expandedReport === report.id;
              const isAnalyzing = analyzingId === report.id;

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="transition-colors border-b last:border-0 border-slate-100"
                >
                  <div className="p-4 flex items-center gap-4">
                    {/* File Icon */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm"
                    >
                      <FileIcon size={20} className="text-slate-500" />
                    </motion.div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate text-sm">{report.original_filename}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>{formatFileSize(report.file_size)}</span>
                        <span>•</span>
                        <span>{report.file_type?.toUpperCase() || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <StatusBadge status={report.analysis_status} lang={preferredLanguage} />

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Analyze Button */}
                      {(report.analysis_status === 'pending' || report.analysis_status === 'failed') && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAnalyze(report)}
                          disabled={isAnalyzing}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-200"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <motion.span
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                {t(preferredLanguage, 'enhancedAnalyzing')}
                              </motion.span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              {t(preferredLanguage, 'enhancedAnalyze')}
                            </>
                          )}
                        </motion.button>
                      )}

                      {/* View Results Button */}
                      {report.analysis_status === 'completed' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleExpand(report.id)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${isExpanded
                              ? 'bg-slate-800 text-white hover:bg-slate-700'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            }`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <Sparkles size={16} />}
                          {isExpanded ? t(preferredLanguage, 'hide') : t(preferredLanguage, 'viewResults')}
                        </motion.button>
                      )}

                      <button
                        onClick={() => handleDownload(report)}
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title={t(preferredLanguage, 'download')}
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, report })}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t(preferredLanguage, 'delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Analysis Results */}
                  <AnimatePresence>
                    {isExpanded && report.analysis_result && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="overflow-hidden bg-slate-50/50"
                      >
                        <div className="p-4 pt-0 border-t border-slate-100">
                          <EnhancedAnalysisResult
                            result={report.analysis_result}
                            documentType={report.document_type || report.analysis_result?.document_detection?.document_type || 'other'}
                            language={preferredLanguage}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {t(preferredLanguage, 'showingReports', { count: reports.length, total: pagination.total })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchReports(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                {t(preferredLanguage, 'previous')}
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-600">
                {t(preferredLanguage, 'pageOf', { page: pagination.page, total: pagination.totalPages })}
              </span>
              <button
                onClick={() => fetchReports(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                {t(preferredLanguage, 'next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{t(preferredLanguage, 'deleteReport')}</h3>
              <button
                onClick={() => setDeleteModal({ open: false, report: null })}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600 mb-6">
              {t(preferredLanguage, 'deleteConfirm')} <strong>{deleteModal.report?.original_filename}</strong>
              {t(preferredLanguage, 'deleteConfirmSuffix')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, report: null })}
                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
              >
                {t(preferredLanguage, 'cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-500 rounded-xl font-medium transition-colors"
              >
                {t(preferredLanguage, 'delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientReportsPage;
