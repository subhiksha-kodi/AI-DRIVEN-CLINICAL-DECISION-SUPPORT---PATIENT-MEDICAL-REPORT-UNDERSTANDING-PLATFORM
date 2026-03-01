import { useState, useEffect, useCallback } from 'react';
import {
  Users, FileText, Clock, CheckCircle,
  Search, Eye, RefreshCw, FileSearch, X, Sparkles, AlertTriangle, Activity,
  ArrowLeft, ClipboardCheck, Lightbulb
} from 'lucide-react';
import doctorApi from '../../api/doctorAxios';
import toast from 'react-hot-toast';

// ─── Tab Names ────────────────────────────────────────────────────────────────
const TABS = {
  ANALYZE_REPORTS: 'analyze-reports',
  EXTRACT_ANALYZE: 'extract-analyze',
  AI_GENERATED: 'ai-generated'
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, bg }) => (
  <div className="stat-card flex items-center gap-4">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
      <Icon size={24} className={color} strokeWidth={2} />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <p className="text-slate-900 text-3xl font-bold mt-0.5">{value ?? '—'}</p>
    </div>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    reviewed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  };
  const { bg, text, dot } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dot}`} />
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

// ─── Report Type Badge ────────────────────────────────────────────────────────
const ReportTypeBadge = ({ type }) => {
  const config = {
    lab: { bg: 'bg-blue-50', text: 'text-blue-700' },
    prescription: { bg: 'bg-violet-50', text: 'text-violet-700' },
    other: { bg: 'bg-slate-100', text: 'text-slate-600' },
  };
  const { bg, text } = config[type] || config.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {type?.charAt(0).toUpperCase() + type?.slice(1)}
    </span>
  );
};

// ─── Helper: Safely extract string from any value ────────────────────────────
const safeString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(v => safeString(v)).join(', ');
  if (typeof value === 'object') {
    // Try common string fields
    if (value.text) return safeString(value.text, fallback);
    if (value.content) return safeString(value.content, fallback);
    if (value.message) return safeString(value.message, fallback);
    if (value.value) return safeString(value.value, fallback);
    // Last resort: stringify
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

// ─── Helper: Get AI explanation text safely ───────────────────────────────────
const getAIExplanationText = (aiExplanation) => {
  if (!aiExplanation) return 'Clinical explanation not available.';
  if (typeof aiExplanation === 'string') return aiExplanation;
  
  // Try common field names in order of preference
  const fields = ['clinical_summary', 'explanation', 'summary', 'text', 'content', 'note', 'error'];
  for (const field of fields) {
    if (aiExplanation[field]) {
      const val = aiExplanation[field];
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val.text) return val.text;
    }
  }
  
  return 'Clinical explanation generated based on rule-based analysis.';
};

// ─── Doctor Dashboard Page ────────────────────────────────────────────────────
const DoctorDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentTab, setCurrentTab] = useState(TABS.ANALYZE_REPORTS);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState(null);

  const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await doctorApi.get('/doctor/stats');
      console.log('Stats data:', data);
      setStats(data.data);
    } catch (err) { 
      console.error('Failed to load stats:', err.response?.data || err.message);
      // Set default values to show 0 instead of dash
      setStats({ totalPatients: 0, reviewedReports: 0, pendingReports: 0 });
    }
  }, []);

  const fetchReports = useCallback(async (page = 1, q = '', status = '') => {
    setLoadingReports(true);
    try {
      const params = { page, limit: 10 };
      if (q) params.search = q;
      if (status) params.status = status;

      const { data } = await doctorApi.get('/doctor/reports', { params });
      setReports(data.data);
      setPagination(data.pagination);
    } catch (err) { 
      console.error('Failed to load reports:', err);
    }
    finally { setLoadingReports(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchReports();
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchReports(1, search, statusFilter), 400);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  const handleMarkReviewed = async (id) => {
    setActionLoading(id);
    try {
      await doctorApi.put(`/doctor/report/${id}/reviewed`);
      toast.success('Report marked as reviewed');
      fetchStats();
      fetchReports(pagination.page, search, statusFilter);
      // Navigate back to reports tab after marking reviewed
      setCurrentTab(TABS.ANALYZE_REPORTS);
      setSelectedReport(null);
      setGeneratedSummary(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update report');
    } finally {
      setActionLoading(null);
    }
  };

  const openExtractAnalyzeTab = (report) => {
    setSelectedReport(report);
    setGeneratedSummary(null);
    setCurrentTab(TABS.EXTRACT_ANALYZE);
  };

  const goBackToReports = () => {
    setCurrentTab(TABS.ANALYZE_REPORTS);
    setSelectedReport(null);
    setGeneratedSummary(null);
  };

  const handleExtractAndAnalyze = async (id) => {
    setActionLoading(`extract-${id}`);
    try {
      const { data } = await doctorApi.put(`/doctor/report/${id}/extract`);
      toast.success('Report extracted and analyzed successfully');
      fetchReports(pagination.page, search, statusFilter);
      if (data.success && data.data) {
        // Navigate to Extract & Analyze tab with extracted data
        openExtractAnalyzeTab({ ...data.data, id });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Extraction failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewReport = (report) => {
    const fileUrl = `${BACKEND_URL}/${report.file_path}`;
    window.open(fileUrl, '_blank');
  };

  const handleGenerateSummary = async (reportId) => {
    setSummaryLoading(true);
    setGeneratedSummary(null);
    try {
      const { data } = await doctorApi.post(`/doctor/report/${reportId}/summary`);
      if (data.success) {
        // Validate response data to prevent rendering errors
        const summaryData = data.data || {};
        setGeneratedSummary(summaryData);
        toast.success('Summary generated successfully');
        // Navigate to AI Generated tab
        setCurrentTab(TABS.AI_GENERATED);
      } else {
        toast.error(data.message || 'Failed to generate summary');
      }
    } catch (err) {
      console.error('Summary generation error:', err);
      toast.error(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Assigned Patients', value: stats?.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Reports Reviewed', value: stats?.reviewedReports, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Review', value: stats?.pendingReports, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  // ─── Render Extract & Analyze Tab Content ─────────────────────────────────────
  const renderExtractAnalyzeTab = () => {
    if (!selectedReport) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle size={48} className="text-amber-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No Report Selected</h2>
          <p className="text-slate-500 mb-4">Please select a report from the Analyze Reports tab to view analysis.</p>
          <button onClick={goBackToReports} className="btn-primary">
            Go to Reports
          </button>
        </div>
      );
    }

    // Check if ai_analysis exists
    const hasAnalysis = selectedReport.ai_analysis && (
      selectedReport.ai_analysis.lab_tests?.length > 0 || 
      selectedReport.ai_analysis.patient_info
    );
    
    return (
      <div className="space-y-6 min-h-[400px]">
        {/* Back Button & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={goBackToReports}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back to Reports</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Extract & Analyze</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Review extracted data for {selectedReport.patient_name}
              </p>
            </div>
          </div>
        </div>

        {/* Show message if no analysis data */}
        {!hasAnalysis && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertTriangle size={40} className="text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-amber-800 mb-2">No Analysis Data Available</h3>
            <p className="text-amber-700 mb-4">
              This report has not been extracted and analyzed yet. Click the button below to extract data using AI.
            </p>
            <button
              onClick={() => handleExtractAndAnalyze(selectedReport.id)}
              disabled={actionLoading === `extract-${selectedReport.id}`}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              {actionLoading === `extract-${selectedReport.id}` ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <FileSearch size={16} />
                  Extract & Analyze Now
                </>
              )}
            </button>
          </div>
        )}

        {/* Analysis Content - Only show if we have data */}
        {hasAnalysis && (
          <>
            {/* Patient Info Card */}
            <div className="bg-white rounded-2xl shadow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Lab Report Analysis</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Patient: {selectedReport.ai_analysis?.patient_info?.name || selectedReport.patient_name} 
                    ({selectedReport.ai_analysis?.patient_info?.registration_number || selectedReport.registration_number})
                    {selectedReport.ai_analysis?.patient_info?.age && ` • Age: ${selectedReport.ai_analysis.patient_info.age}`}
                    {selectedReport.ai_analysis?.patient_info?.sex && ` • ${selectedReport.ai_analysis.patient_info.sex}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Generate AI Summary Button */}
                  <button
                    onClick={() => handleGenerateSummary(selectedReport.id)}
                    disabled={summaryLoading}
                    className="btn-secondary flex items-center gap-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 disabled:opacity-50"
                  >
                    {summaryLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Generate AI Summary
                      </>
                    )}
                  </button>
                  {/* Mark Reviewed Button */}
                  {selectedReport.status === 'pending' && (
                    <button
                      onClick={() => handleMarkReviewed(selectedReport.id)}
                      disabled={actionLoading === selectedReport.id}
                      className="btn-success flex items-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading === selectedReport.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ClipboardCheck size={16} />
                      )}
                      Mark Reviewed
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-card p-6 space-y-6">
              {/* AI Summary Section (from existing extraction) */}
              {selectedReport.ai_analysis?.ai_summary && (
                <section>
                  <h4 className="text-emerald-700 font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle size={18} /> AI-Generated Summary
                  </h4>
                  <div className={`rounded-xl p-5 border ${
                    selectedReport.ai_analysis.ai_summary.overall_status === 'CRITICAL' 
                      ? 'bg-red-50 border-red-200' 
                      : selectedReport.ai_analysis.ai_summary.overall_status === 'ABNORMAL'
                      ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-100'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedReport.ai_analysis.ai_summary.overall_status === 'CRITICAL'
                      ? 'bg-red-100 text-red-700'
                      : selectedReport.ai_analysis.ai_summary.overall_status === 'ABNORMAL'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    Status: {selectedReport.ai_analysis.ai_summary.overall_status}
                  </span>
                </div>
                {selectedReport.ai_analysis.ai_summary.narrative_summary && (
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    {selectedReport.ai_analysis.ai_summary.narrative_summary}
                  </p>
                )}
                {selectedReport.ai_analysis.ai_summary.key_findings?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Key Findings:</h5>
                    <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
                      {selectedReport.ai_analysis.ai_summary.key_findings.map((finding, i) => (
                        <li key={i}>{typeof finding === 'string' ? finding : finding?.message || finding?.finding || JSON.stringify(finding)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedReport.ai_analysis.ai_summary.action_items?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-emerald-200">
                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Recommended Actions:</h5>
                    <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
                      {selectedReport.ai_analysis.ai_summary.action_items.map((item, i) => (
                        <li key={i}>
                          {typeof item === 'string' 
                            ? item 
                            : item?.action 
                              ? `${item.action}${item.timeframe ? ` (${item.timeframe})` : ''}${item.priority ? ` - ${item.priority}` : ''}`
                              : JSON.stringify(item)
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Risk Analysis Section */}
          {selectedReport.ai_analysis?.risk_analysis && (
            <section>
              <h4 className="text-blue-700 font-semibold mb-3 flex items-center gap-2">
                <FileText size={18} /> Risk Analysis
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{selectedReport.ai_analysis.risk_analysis.total_tests || 0}</p>
                  <p className="text-xs text-slate-500">Total Tests</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {(selectedReport.ai_analysis.risk_analysis.total_tests || 0) - 
                     (selectedReport.ai_analysis.risk_analysis.abnormal_count || 0) - 
                     (selectedReport.ai_analysis.risk_analysis.critical_count || 0)}
                  </p>
                  <p className="text-xs text-slate-500">Normal</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{selectedReport.ai_analysis.risk_analysis.abnormal_count || 0}</p>
                  <p className="text-xs text-slate-500">Abnormal</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{selectedReport.ai_analysis.risk_analysis.critical_count || 0}</p>
                  <p className="text-xs text-slate-500">Critical</p>
                </div>
              </div>
            </section>
          )}

          {/* Critical Alerts */}
          {selectedReport.ai_analysis?.alerts?.length > 0 && (
            <section>
              <h4 className="text-red-700 font-semibold mb-3 flex items-center gap-2">
                ⚠️ Alerts Requiring Attention
              </h4>
              <div className="space-y-3">
                {selectedReport.ai_analysis.alerts.map((alert, i) => (
                  <div key={i} className={`rounded-xl p-4 border ${
                    alert.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">{alert.test_name}</span>
                        <span className="ml-2 text-slate-600">
                          {alert.value} {alert.unit}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{alert.message}</p>
                    {alert.recommendation && (
                      <p className="text-sm text-blue-600 mt-1">💡 {alert.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Culture & Sensitivity - Antibiogram Table */}
          {selectedReport.ai_analysis?.antibiogram?.length > 0 && (
            <section className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
              <h4 className="text-purple-800 font-bold mb-3 flex items-center gap-2">
                <Activity size={18} /> Culture & Sensitivity Report - Antibiogram
              </h4>
              
              {/* Organism & Specimen Info */}
              {selectedReport.ai_analysis?.culture_sensitivity && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {selectedReport.ai_analysis.culture_sensitivity.organism_isolated && (
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium">Organism Isolated</p>
                      <p className="text-sm font-bold text-purple-900">{selectedReport.ai_analysis.culture_sensitivity.organism_isolated}</p>
                    </div>
                  )}
                  {selectedReport.ai_analysis.culture_sensitivity.specimen && (
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium">Specimen</p>
                      <p className="text-sm font-bold text-purple-900">{selectedReport.ai_analysis.culture_sensitivity.specimen}</p>
                    </div>
                  )}
                  {selectedReport.ai_analysis.culture_sensitivity.colony_count && (
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium">Colony Count</p>
                      <p className="text-sm font-bold text-purple-900">{selectedReport.ai_analysis.culture_sensitivity.colony_count}</p>
                    </div>
                  )}
                  {selectedReport.ai_analysis.culture_sensitivity.isolation && (
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium">Isolation</p>
                      <p className="text-sm font-bold text-purple-900">{selectedReport.ai_analysis.culture_sensitivity.isolation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Antibiogram Table */}
              <div className="overflow-x-auto rounded-xl border border-purple-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-100 border-b border-purple-200">
                      <th className="text-left px-4 py-3 font-semibold text-purple-800">Antibiotic</th>
                      <th className="text-center px-4 py-3 font-semibold text-purple-800">Sensitivity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.ai_analysis.antibiogram.map((item, i) => (
                      <tr key={i} className={`border-b border-purple-50 ${
                        item.result?.toLowerCase() === 'resistant' ? 'bg-red-50' :
                        item.result?.toLowerCase().includes('moderately') ? 'bg-amber-50' :
                        'bg-emerald-50'
                      }`}>
                        <td className="px-4 py-2 font-medium text-slate-800">{item.antibiotic}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.result?.toLowerCase() === 'resistant' ? 'bg-red-100 text-red-700' :
                            item.result?.toLowerCase().includes('moderately') ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Summary Stats */}
              <div className="mt-3 flex gap-4 text-xs">
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                  Sensitive: {selectedReport.ai_analysis.antibiogram.filter(a => a.result?.toLowerCase() === 'sensitive').length}
                </span>
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                  Moderately Sensitive: {selectedReport.ai_analysis.antibiogram.filter(a => a.result?.toLowerCase().includes('moderately')).length}
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                  Resistant: {selectedReport.ai_analysis.antibiogram.filter(a => a.result?.toLowerCase() === 'resistant').length}
                </span>
              </div>
            </section>
          )}

          {/* Lab Tests Table */}
          {selectedReport.ai_analysis?.lab_tests?.length > 0 && (
            <section>
              <h4 className="text-slate-700 font-semibold mb-3 flex items-center gap-2">
                <FileSearch size={18} /> Lab Test Results ({selectedReport.ai_analysis.lab_tests.length} tests)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Test Name</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Value</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Unit</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Reference Range</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.ai_analysis.lab_tests.map((test, i) => (
                      <tr key={i} className={`border-b border-slate-100 ${
                        test.status === 'CRITICAL' ? 'bg-red-50' : 
                        test.status === 'HIGH' || test.status === 'LOW' ? 'bg-amber-50' : ''
                      }`}>
                        <td className="px-4 py-3 font-medium text-slate-800">{test.test_name}</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-700">{test.value}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{test.unit || '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-500 text-xs">{test.reference_range || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            test.status === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                            test.status === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                            test.status === 'LOW' ? 'bg-blue-100 text-blue-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {test.status || 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Extraction Info */}
          <section className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            <p>
              Extraction Source: {selectedReport.ai_analysis?.extraction_source || 'Standard'} | 
              Scanned Document: {selectedReport.ai_analysis?.is_scanned ? 'Yes' : 'No'} |
              Extracted: {selectedReport.ai_analysis?.patient_info?.extraction_date || 'N/A'}
            </p>
          </section>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-white rounded-2xl shadow-card p-4 flex justify-between items-center">
          <button
            onClick={goBackToReports}
            className="btn-ghost flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Reports
          </button>
          <button
            onClick={() => handleViewReport(selectedReport)}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye size={16} />
            View Original
          </button>
        </div>
          </>
        )}
      </div>
    );
  };

  // ─── Render AI Generated Tab Content ───────────────────────────────────────────
  const renderAIGeneratedTab = () => {
    // Show loading state when generating summary
    if (summaryLoading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentTab(TABS.EXTRACT_ANALYZE)}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back to Extract & Analyze</span>
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Generating AI Summary...</h3>
            <p className="text-slate-500 text-sm">
              This may take a moment. Analyzing your medical data with AI.
            </p>
          </div>
        </div>
      );
    }

    if (!selectedReport || !generatedSummary) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentTab(TABS.ANALYZE_REPORTS)}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back to Reports</span>
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-12 text-center">
            <Sparkles className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No AI Summary Generated</h3>
            <p className="text-slate-500 text-sm mb-6">
              Please select a report and click "Extract & Analyze" to generate an AI summary.
            </p>
            <button
              onClick={() => setCurrentTab(TABS.ANALYZE_REPORTS)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <FileSearch size={16} />
              Go to Reports
            </button>
          </div>
        </div>
      );
    }
    
    // Build clinical narrative text from the summary data - Professional paragraph format
    const buildClinicalNarrative = () => {
      const patient = generatedSummary.patient || {};
      const risk = generatedSummary.risk_assessment || {};
      const stats = generatedSummary.statistics || {};
      const findings = generatedSummary.findings || {};
      
      // Helper to format title (Mr./Ms./Mrs.)
      const getTitle = (sex) => {
        if (!sex) return '';
        const s = sex.toLowerCase();
        if (s === 'male' || s === 'm') return 'Mr.';
        if (s === 'female' || s === 'f') return 'Ms.';
        return '';
      };
      
      // Helper to format risk level text
      const getRiskText = (level) => {
        if (!level) return 'normal';
        const l = level.toUpperCase();
        if (l === 'CRITICAL') return 'critical';
        if (l === 'HIGH') return 'high';
        if (l === 'MODERATE') return 'moderate';
        return 'normal';
      };
      
      const paragraphs = [];
      const title = getTitle(patient.sex);
      const name = patient.name || selectedReport.patient_name || 'the patient';
      const age = patient.age;
      const sex = patient.sex ? patient.sex.toLowerCase() : '';
      const regNo = patient.registration_number || selectedReport.registration_number || 'N/A';
      const totalTests = stats.total_tests || 0;
      const abnormalCount = stats.abnormal_count || 0;
      const criticalCount = stats.critical_count || 0;
      const riskLevel = getRiskText(risk.level);
      
      // Paragraph 1: Patient introduction and overview
      let intro = `${title} ${name}`.trim();
      if (age && sex) {
        intro += `, a ${age}-year-old ${sex}`;
      } else if (age) {
        intro += `, ${age} years old`;
      } else if (sex) {
        intro += `, ${sex}`;
      }
      intro += ` (Registration No. ${regNo}), underwent laboratory evaluation`;
      if (totalTests > 0) {
        intro += ` comprising ${totalTests} tests`;
      }
      intro += `. The overall assessment indicates a ${riskLevel} clinical risk level`;
      if (abnormalCount > 0 || criticalCount > 0) {
        intro += `, with ${abnormalCount} parameter${abnormalCount !== 1 ? 's' : ''} outside the normal reference range`;
        if (criticalCount > 0) {
          intro += ` and ${criticalCount} critically abnormal value${criticalCount !== 1 ? 's' : ''}`;
        } else {
          intro += ' and no critically abnormal values';
        }
      }
      intro += '.';
      paragraphs.push(intro);
      
      // Paragraph 2: Critical findings (if any)
      if (findings.critical?.length > 0) {
        const criticalDescriptions = findings.critical.map(f => {
          const status = f.status?.toLowerCase() || '';
          const direction = status.includes('high') ? 'elevated' : status.includes('low') ? 'reduced' : 'abnormal';
          return `${direction} ${f.test} at ${f.value} (reference range: ${f.reference || 'N/A'})`;
        });
        
        let criticalPara = 'Critical findings requiring immediate attention include ';
        if (criticalDescriptions.length === 1) {
          criticalPara += criticalDescriptions[0];
        } else if (criticalDescriptions.length === 2) {
          criticalPara += `${criticalDescriptions[0]} and ${criticalDescriptions[1]}`;
        } else {
          criticalPara += criticalDescriptions.slice(0, -1).join(', ') + ', and ' + criticalDescriptions[criticalDescriptions.length - 1];
        }
        criticalPara += '.';
        paragraphs.push(criticalPara);
      }
      
      // Paragraph 3: Abnormal findings
      if (findings.abnormal?.length > 0) {
        const abnormalDescriptions = findings.abnormal.map(f => {
          const status = f.status?.toLowerCase() || '';
          const direction = status.includes('high') ? 'elevated' : status.includes('low') ? 'reduced' : 'abnormal';
          return `${direction} ${f.test.toLowerCase()} (${f.value}; reference range: ${f.reference || 'N/A'})`;
        });
        
        let abnormalPara = 'The abnormalities identified include ';
        if (abnormalDescriptions.length === 1) {
          abnormalPara += abnormalDescriptions[0];
        } else if (abnormalDescriptions.length === 2) {
          abnormalPara += `${abnormalDescriptions[0]} and ${abnormalDescriptions[1]}`;
        } else {
          abnormalPara += abnormalDescriptions.slice(0, -1).join(', ') + ', and ' + abnormalDescriptions[abnormalDescriptions.length - 1];
        }
        abnormalPara += '.';
        paragraphs.push(abnormalPara);
      }
      
      // Paragraph 4: Clinical interpretation (affected organs and flags)
      const activeFlags = Object.entries(generatedSummary.clinical_flags || {})
        .filter(([_, value]) => value)
        .map(([flag]) => flag.replace(/_/g, ' '));
      const organs = generatedSummary.affected_organs || [];
      
      if (organs.length > 0 || activeFlags.length > 0) {
        let interpretPara = '';
        if (organs.length > 0) {
          interpretPara = `These findings may indicate involvement of the following organ systems: ${organs.join(', ').toLowerCase()}`;
          if (activeFlags.length > 0) {
            interpretPara += `. Clinical flags noted include ${activeFlags.join(', ').toLowerCase()}`;
          }
        } else if (activeFlags.length > 0) {
          interpretPara = `Clinical flags noted include ${activeFlags.join(', ').toLowerCase()}`;
        }
        interpretPara += '.';
        paragraphs.push(interpretPara);
      }
      
      // Paragraph 5: Risk assessment conclusion
      let conclusion = `Based solely on the available laboratory data, these findings represent ${riskLevel} risk`;
      const justificationText = safeString(risk.justification);
      if (justificationText) {
        const justificationLower = justificationText.toLowerCase();
        conclusion += ` ${justificationLower.startsWith('due') ? '' : 'due to '}${justificationLower}`;
      } else if (abnormalCount > 0 && criticalCount === 0) {
        conclusion += ' due to multiple deviations from reference values, though no critical abnormalities are present';
      } else if (criticalCount > 0) {
        conclusion += ' due to presence of critical values requiring immediate clinical attention';
      }
      conclusion += '. Clinical correlation is advised.';
      paragraphs.push(conclusion);
      
      return paragraphs.join('\n\n');
    };

    return (
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentTab(TABS.EXTRACT_ANALYZE)}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back to Extract & Analyze</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="text-purple-500" size={24} /> AI Generated Summary
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Clinical analysis for {selectedReport.patient_name}
              </p>
            </div>
          </div>
          {selectedReport.status === 'pending' && (
            <button
              onClick={() => handleMarkReviewed(selectedReport.id)}
              disabled={actionLoading === selectedReport.id}
              className="btn-success flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading === selectedReport.id ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ClipboardCheck size={16} />
              )}
              Mark Reviewed
            </button>
          )}
        </div>

        {/* REMOVE THIS ENTIRE SECTION */}
        {/*
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-card p-6 border border-purple-100">
          <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
            <FileText size={20} /> Clinical Narrative Report
          </h3>
          <div className="bg-white rounded-xl p-5 border border-purple-200">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
              {buildClinicalNarrative()}
            </p>
          </div>
          <p className="text-xs text-purple-600 mt-3 italic">
            This narrative is generated from rule-based analysis. Always verify with clinical judgment.
          </p>
        </div>
        */}

        {/* AI Explanation from Gemini */}
        {generatedSummary.ai_explanation && (
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-purple-500" /> AI Clinical Explanation
            </h3>
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-base">
                {getAIExplanationText(generatedSummary.ai_explanation)}
              </div>
              
              {/* Expanded Clinical Interpretation */}
              {generatedSummary.ai_explanation.expanded_clinical_interpretation && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                    <FileText size={16} /> Expanded Clinical Interpretation
                  </h5>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <ul className="space-y-2 text-base text-slate-700 leading-relaxed">
                      {(Array.isArray(generatedSummary.ai_explanation.expanded_clinical_interpretation)
                        ? generatedSummary.ai_explanation.expanded_clinical_interpretation
                        : safeString(generatedSummary.ai_explanation.expanded_clinical_interpretation).split(/[.\n]/)
                      )
                        .map(item =>
                          String(item)
                            .replace(/^[\s•\-]+/, '')
                            .trim()
                        )
                        .filter(text => text.length > 0)
                        .map((text, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span>•</span>
                            <span>{text}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Risk Level Justification */}
              {generatedSummary.ai_explanation.risk_level_justification && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Risk Level Explanation:</h5>
                  <p className="text-base text-slate-600">{safeString(generatedSummary.ai_explanation.risk_level_justification)}</p>
                </div>
              )}
              
              {/* Abnormal Findings Explanation */}
              {generatedSummary.ai_explanation.abnormal_findings_explanation && 
               Array.isArray(generatedSummary.ai_explanation.abnormal_findings_explanation) && 
               generatedSummary.ai_explanation.abnormal_findings_explanation.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Abnormal Findings Explained:</h5>
                  <div className="space-y-3">
                    {generatedSummary.ai_explanation.abnormal_findings_explanation.map((item, i) => (
                      <div key={i} className="bg-amber-50 rounded-lg p-4 text-base border border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">{safeString(item.test)}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'HIGH' ? 'bg-red-100 text-red-700' :
                            item.status === 'LOW' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {safeString(item.status || item.value_with_unit)}
                          </span>
                        </div>
                        <div className="text-amber-800 font-medium mb-2">
                          {item.value && item.unit ? `${safeString(item.value)} ${safeString(item.unit)}` : safeString(item.value_with_unit)}
                          {item.reference_range && <span className="text-slate-500 ml-2">(Ref: {safeString(item.reference_range)})</span>}
                        </div>
                        <p className="text-slate-600 mt-2 leading-relaxed">{safeString(item.clinical_significance)}</p>
                        {item.possible_conditions && Array.isArray(item.possible_conditions) && item.possible_conditions.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-amber-200">
                            <span className="text-xs font-medium text-slate-500">Commonly associated with: </span>
                            <span className="text-xs text-slate-600">{item.possible_conditions.map(c => safeString(c)).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Organ Systems Affected */}
              {generatedSummary.ai_explanation.organ_systems_affected && 
               typeof generatedSummary.ai_explanation.organ_systems_affected === 'object' &&
               Object.keys(generatedSummary.ai_explanation.organ_systems_affected).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Organ Systems Assessment:</h5>
                  <div className="space-y-2">
                    {Object.entries(generatedSummary.ai_explanation.organ_systems_affected).map(([system, data], i) => (
                      <div key={i} className="bg-blue-50 rounded-lg p-3 text-base border border-blue-100">
                        <span className="font-semibold text-blue-800 capitalize">{safeString(system).replace(/_/g, ' ')}</span>
                        {data && typeof data === 'object' ? (
                          <div className="mt-1">
                            <p className="text-slate-600">{safeString(data.explanation)}</p>
                            {data.specific_concerns && Array.isArray(data.specific_concerns) && (
                              <ul className="mt-1 text-xs text-slate-500 list-disc list-inside">
                                {data.specific_concerns.map((concern, j) => <li key={j}>{safeString(concern)}</li>)}
                              </ul>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-600 ml-2">{safeString(data)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Potential Complications */}
              {generatedSummary.ai_explanation.potential_complications && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} /> Potential Complications (If Untreated)
                  </h5>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <p className="text-base text-slate-700 leading-relaxed">
                      {safeString(generatedSummary.ai_explanation.potential_complications)}
                    </p>
                  </div>
                </div>
              )}

              {/* Differential Considerations */}
              {generatedSummary.ai_explanation.differential_considerations && 
               Array.isArray(generatedSummary.ai_explanation.differential_considerations) && 
               generatedSummary.ai_explanation.differential_considerations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Differential Considerations:</h5>
                  <ul className="list-disc list-inside text-base text-slate-600 space-y-1 bg-slate-100 rounded-lg p-3">
                    {generatedSummary.ai_explanation.differential_considerations.map((item, i) => (
                      <li key={i}>{safeString(item)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {generatedSummary.ai_explanation.recommendations && 
               Array.isArray(generatedSummary.ai_explanation.recommendations) && 
               generatedSummary.ai_explanation.recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Recommendations:</h5>
                  <ul className="list-disc list-inside text-base text-slate-600 space-y-1">
                    {generatedSummary.ai_explanation.recommendations.map((rec, i) => (
                      <li key={i}>{safeString(rec)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up Tests */}
              {generatedSummary.ai_explanation.follow_up_tests && 
               Array.isArray(generatedSummary.ai_explanation.follow_up_tests) && 
               generatedSummary.ai_explanation.follow_up_tests.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Suggested Follow-up Tests:</h5>
                  <ul className="list-disc list-inside text-base text-blue-600 space-y-1">
                    {generatedSummary.ai_explanation.follow_up_tests.map((test, i) => (
                      <li key={i}>
                        {typeof test === 'object' && test.test_name ? (
                          <>
                            <span className="font-medium">{safeString(test.test_name)}</span>
                            {test.rationale && <span className="text-slate-500 ml-1">- {safeString(test.rationale)}</span>}
                          </>
                        ) : (
                          safeString(test)
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clinical Pearls */}
              {generatedSummary.ai_explanation.clinical_pearls && 
               Array.isArray(generatedSummary.ai_explanation.clinical_pearls) && 
               generatedSummary.ai_explanation.clinical_pearls.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                    <Lightbulb size={16} /> Clinical Pearls
                  </h5>
                  <ul className="bg-emerald-50 rounded-lg p-3 text-base text-slate-700 space-y-1">
                    {generatedSummary.ai_explanation.clinical_pearls.map((pearl, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500">•</span>
                        <span>{safeString(pearl)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Limitations */}
              {generatedSummary.ai_explanation.limitations && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Limitations:</h5>
                  <p className="text-base text-slate-500 italic">{safeString(generatedSummary.ai_explanation.limitations)}</p>
                </div>
              )}

              {/* Disclaimer */}
              {generatedSummary.ai_explanation.disclaimer && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-400 italic">{safeString(generatedSummary.ai_explanation.disclaimer)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Assessment Card */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Risk Assessment</h3>
          <div className={`rounded-xl p-5 ${
            generatedSummary.risk_assessment?.level === 'CRITICAL' 
              ? 'bg-red-50 border border-red-200' 
              : generatedSummary.risk_assessment?.level === 'HIGH'
              ? 'bg-orange-50 border border-orange-200'
              : generatedSummary.risk_assessment?.level === 'MODERATE'
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-emerald-50 border border-emerald-100'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                generatedSummary.risk_assessment?.level === 'CRITICAL'
                  ? 'bg-red-100 text-red-700'
                  : generatedSummary.risk_assessment?.level === 'HIGH'
                  ? 'bg-orange-100 text-orange-700'
                  : generatedSummary.risk_assessment?.level === 'MODERATE'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {generatedSummary.risk_assessment?.level === 'CRITICAL' && <AlertTriangle className="inline mr-1" size={14} />}
                Risk Level: {generatedSummary.risk_assessment?.level}
                {generatedSummary.risk_assessment?.score !== undefined && ` (Score: ${generatedSummary.risk_assessment.score})`}
              </span>
              <span className="text-xs text-slate-500">Rule-Based Clinical Analysis</span>
            </div>
            {generatedSummary.risk_assessment?.justification && (
              <p className="text-slate-700 text-sm leading-relaxed">
                {safeString(generatedSummary.risk_assessment.justification)}
              </p>
            )}
          </div>
        </div>

        {/* Statistics & Affected Organs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statistics */}
          {generatedSummary.statistics && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Test Statistics</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{generatedSummary.statistics.total_tests}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="bg-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{generatedSummary.statistics.normal_count}</p>
                  <p className="text-xs text-slate-500">Normal</p>
                </div>
                <div className="bg-amber-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{generatedSummary.statistics.abnormal_count}</p>
                  <p className="text-xs text-slate-500">Abnormal</p>
                </div>
                <div className="bg-red-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{generatedSummary.statistics.critical_count}</p>
                  <p className="text-xs text-slate-500">Critical</p>
                </div>
              </div>
            </div>
          )}

          {/* Affected Organs & Clinical Flags */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Clinical Indicators</h3>
            
            {/* Affected Organs */}
            {generatedSummary.affected_organs && generatedSummary.affected_organs.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Activity size={14} /> Affected Organ Systems
                </h5>
                <div className="flex flex-wrap gap-2">
                  {generatedSummary.affected_organs.map((organ, i) => (
                    <span key={i} className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                      {organ}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Flags */}
            {generatedSummary.clinical_flags && Object.keys(generatedSummary.clinical_flags).some(k => generatedSummary.clinical_flags[k]) && (
              <div>
                <h5 className="text-sm font-semibold text-slate-700 mb-2">Clinical Flags</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(generatedSummary.clinical_flags)
                    .filter(([_, value]) => value)
                    .map(([flag]) => (
                      <span key={flag} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    ))
                  }
                </div>
              </div>
            )}

            {(!generatedSummary.affected_organs || generatedSummary.affected_organs.length === 0) && 
             (!generatedSummary.clinical_flags || !Object.values(generatedSummary.clinical_flags).some(v => v)) && (
              <p className="text-slate-500 text-sm">No significant clinical indicators detected.</p>
            )}
          </div>
        </div>

        {/* Findings Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Findings */}
          {generatedSummary.findings?.critical?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} /> Critical Findings
              </h3>
              <div className="space-y-3">
                {generatedSummary.findings.critical.map((finding, i) => (
                  <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{safeString(finding.test)}</span>
                      <span className="font-mono text-sm text-red-700 font-bold">{safeString(finding.value)}</span>
                    </div>
                    {finding.reference && (
                      <p className="text-xs text-slate-500 mt-1">Reference: {safeString(finding.reference)}</p>
                    )}
                    {finding.organ && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">
                        {safeString(finding.organ)}
                      </span>
                    )}
                    {finding.message && (
                      <p className="text-sm text-red-700 mt-2">{safeString(finding.message)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Abnormal Findings */}
          {generatedSummary.findings?.abnormal?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="text-lg font-bold text-amber-700 mb-4">Abnormal Findings</h3>
              <div className="space-y-3">
                {generatedSummary.findings.abnormal.map((finding, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{safeString(finding.test)}</span>
                      <span className="font-mono text-sm text-amber-700">{safeString(finding.value)}</span>
                    </div>
                    {finding.reference && (
                      <p className="text-xs text-slate-500 mt-1">Reference: {safeString(finding.reference)}</p>
                    )}
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                      finding.status === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {safeString(finding.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">
            ⚕️ {safeString(generatedSummary.disclaimer, 'This summary is for informational purposes only. Risk levels are calculated using standard clinical reference ranges. Always consult clinical judgment for patient care decisions.')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Generated: {generatedSummary.generated_at ? new Date(generatedSummary.generated_at).toLocaleString() : 'N/A'}
          </p>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-white rounded-2xl shadow-card p-4 flex justify-between items-center">
          <button
            onClick={() => setCurrentTab(TABS.EXTRACT_ANALYZE)}
            className="btn-ghost flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Extract & Analyze
          </button>
          <button
            onClick={() => handleViewReport(selectedReport)}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye size={16} />
            View Original
          </button>
        </div>
      </div>
    );
  };

  // ─── Render Reports Tab Content ───────────────────────────────────────────────
  const renderReportsTab = () => (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {statCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Reports Section */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-slate-800 font-semibold text-lg flex items-center gap-2">
            <FileSearch size={20} className="text-emerald-600" /> Your Reports
            <span className="text-slate-400 font-normal text-sm">({pagination.total})</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field w-full sm:w-36 text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
            </select>
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                className="input-field pl-9 w-full sm:w-64"
                placeholder="Search patient name or reg no..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient Name</th>
                <th>Reg. Number</th>
                <th>Report Type</th>
                <th>Upload Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingReports ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    Loading reports...
                  </div>
                </td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">
                  No reports found {search && `for "${search}"`}
                </td></tr>
              ) : reports.map((report, idx) => (
                <tr key={report.id}>
                  <td className="text-slate-400 text-xs">{((pagination.page - 1) * pagination.limit) + idx + 1}</td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-600 text-xs font-bold uppercase">
                          {report.patient_name?.charAt(0) || 'P'}
                        </span>
                      </div>
                      <span className="font-medium text-slate-800">{report.patient_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-600">
                      {report.registration_number}
                    </span>
                  </td>
                  <td><ReportTypeBadge type={report.report_type} /></td>
                  <td className="text-slate-500 text-xs whitespace-nowrap">
                    {new Date(report.uploaded_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td><StatusBadge status={report.status} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="btn-ghost flex items-center gap-1"
                        title="View Report"
                      >
                        <Eye size={14} /> View
                      </button>
                      {report.extracted_data && (
                        <button
                          onClick={() => openExtractAnalyzeTab(report)}
                          className="btn-ghost flex items-center gap-1 text-blue-600"
                          title="View Analysis Results"
                        >
                          <FileSearch size={14} /> Results
                        </button>
                      )}
                      {report.status === 'pending' && (
                        <button
                          onClick={() => handleMarkReviewed(report.id)}
                          disabled={actionLoading === report.id}
                          className="btn-success flex items-center gap-1 disabled:opacity-50"
                        >
                          {actionLoading === report.id ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          Mark Reviewed
                        </button>
                      )}
                      {report.status === 'pending' && (
                        <button
                          onClick={() => handleExtractAndAnalyze(report.id)}
                          disabled={actionLoading === `extract-${report.id}`}
                          className="btn-primary flex items-center gap-1 disabled:opacity-50"
                          title="Extract Text & AI Analysis"
                        >
                          {actionLoading === `extract-${report.id}` ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <FileSearch size={14} />
                          )}
                          Extract & Analyze
                        </button>
                      )}
                      {report.status === 'reviewed' && (
                        <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                          <CheckCircle size={12} /> Reviewed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1}
                onClick={() => fetchReports(pagination.page - 1, search, statusFilter)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchReports(pagination.page + 1, search, statusFilter)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Tab Navigation */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setCurrentTab(TABS.ANALYZE_REPORTS)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                currentTab === TABS.ANALYZE_REPORTS
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileSearch size={16} />
                Analyze Reports
              </span>
            </button>
            <button
              onClick={() => selectedReport && setCurrentTab(TABS.EXTRACT_ANALYZE)}
              disabled={!selectedReport}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                currentTab === TABS.EXTRACT_ANALYZE
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : selectedReport 
                    ? 'text-slate-500 hover:text-slate-700'
                    : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText size={16} />
                Extract & Analyze
              </span>
            </button>
            <button
              onClick={() => generatedSummary && setCurrentTab(TABS.AI_GENERATED)}
              disabled={!generatedSummary}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                currentTab === TABS.AI_GENERATED
                  ? 'bg-white text-purple-600 shadow-sm'
                  : generatedSummary 
                    ? 'text-slate-500 hover:text-purple-600'
                    : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={16} />
                AI Generated
              </span>
            </button>
          </div>
        </div>
        {currentTab === TABS.ANALYZE_REPORTS && (
          <button onClick={() => { fetchStats(); fetchReports(pagination.page, search, statusFilter); }}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition">
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {/* Tab Content */}
      {currentTab === TABS.ANALYZE_REPORTS && renderReportsTab()}
      {currentTab === TABS.EXTRACT_ANALYZE && renderExtractAnalyzeTab()}
      {currentTab === TABS.AI_GENERATED && renderAIGeneratedTab()}
    </div>
  );
};

export default DoctorDashboardPage;
