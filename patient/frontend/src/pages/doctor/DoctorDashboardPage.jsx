import { useState, useEffect, useCallback } from 'react';
import {
  Users, FileText, Clock, CheckCircle,
  Search, Eye, RefreshCw, FileSearch, X
} from 'lucide-react';
import doctorApi from '../../api/doctorAxios';
import toast from 'react-hot-toast';

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
  const [showResultsModal, setShowResultsModal] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await doctorApi.get('/doctor/stats');
      setStats(data.data);
    } catch { toast.error('Failed to load stats'); }
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
    } catch { toast.error('Failed to load reports'); }
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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update report');
    } finally {
      setActionLoading(null);
    }
  };

  const openResultsModal = (report) => {
    setSelectedReport(report);
    setSelectedAnalysis(report.ai_analysis || null);
    setShowResultsModal(true);
  };

  const handleExtractAndAnalyze = async (id) => {
    setActionLoading(`extract-${id}`);
    try {
      const { data } = await doctorApi.put(`/doctor/report/${id}/extract`);
      toast.success('Report extracted and analyzed successfully');
      await fetchReports(pagination.page, search, statusFilter);
      if (data.success && data.data) {
        // Open modal with latest AI analysis from backend
        openResultsModal({
          ...data.data,
          id,
        });
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

  const statCards = [
    { label: 'Total Assigned Patients', value: stats?.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Reports Reviewed', value: stats?.reviewedReports, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Review', value: stats?.pendingReports, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analyze Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Review and analyze patient reports assigned to you</p>
        </div>
        <button onClick={() => { fetchStats(); fetchReports(pagination.page, search, statusFilter); }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

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
                          onClick={() => openResultsModal(report)}
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
                      {report.status === 'pending' && report.is_digital && (
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
                          Extract & Analysis
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

      {/* Results Modal */}
      {showResultsModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Extraction & Analysis Results</h3>
                <p className="text-slate-500 text-sm">Patient: {selectedReport.patient_name} ({selectedReport.registration_number})</p>
              </div>
              <button onClick={() => setShowResultsModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* AI Analysis Section */}
              <section>
                <h4 className="text-emerald-700 font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle size={18} /> Clinical AI Insights
                </h4>

                {!selectedAnalysis && (
                  <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 text-sm text-emerald-700">
                    No AI analysis available yet. Click "Extract & Analysis" on a digital report to generate insights.
                  </div>
                )}

                {selectedAnalysis && (
                  <div className="space-y-6">
                    {/* Alerts */}
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800 mb-2">Clinical Alerts</h5>
                      {(!selectedAnalysis.alerts || selectedAnalysis.alerts.length === 0) ? (
                        <p className="text-xs text-slate-500 italic">No explicit alerts detected.</p>
                      ) : (
                        <div className="space-y-3">
                          {selectedAnalysis.alerts.map((alert, idx) => (
                            <div
                              key={idx}
                              className="border border-amber-100 bg-amber-50 rounded-xl p-3 text-xs flex flex-col gap-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-amber-800">{alert.title}</span>
                                {alert.severity && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wide font-semibold">
                                    {alert.severity}
                                  </span>
                                )}
                              </div>
                              {alert.description && (
                                <p className="text-slate-700">{alert.description}</p>
                              )}
                              {alert.related_entities && alert.related_entities.length > 0 && (
                                <p className="text-slate-500">
                                  <span className="font-medium">Related:</span>{' '}
                                  {alert.related_entities.join(', ')}
                                </p>
                              )}
                              {alert.recommended_action && (
                                <p className="text-amber-800 font-medium">
                                  Recommended: {alert.recommended_action}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Drug Interactions */}
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800 mb-2">Drug Interactions</h5>
                      {(!selectedAnalysis.drug_interactions || selectedAnalysis.drug_interactions.length === 0) ? (
                        <p className="text-xs text-slate-500 italic">No drug–drug interactions highlighted.</p>
                      ) : (
                        <div className="space-y-3">
                          {selectedAnalysis.drug_interactions.map((item, idx) => (
                            <div
                              key={idx}
                              className="border border-rose-100 bg-rose-50 rounded-xl p-3 text-xs space-y-1"
                            >
                              <p className="font-semibold text-rose-800">
                                {Array.isArray(item.drugs) ? item.drugs.join(' + ') : item.drugs}
                              </p>
                              {item.interaction_type && (
                                <p className="text-slate-700">{item.interaction_type}</p>
                              )}
                              {item.severity && (
                                <p className="text-[11px] text-rose-700 font-semibold uppercase">
                                  Severity: {item.severity}
                                </p>
                              )}
                              {item.guideline_reference && (
                                <p className="text-[11px] text-slate-500">
                                  Guideline: {item.guideline_reference}
                                </p>
                              )}
                              {item.recommendation && (
                                <p className="text-rose-800 font-medium">
                                  Recommendation: {item.recommendation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Risk Scores */}
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800 mb-2">Risk Scores</h5>
                      {(!selectedAnalysis.risk_scores || selectedAnalysis.risk_scores.length === 0) ? (
                        <p className="text-xs text-slate-500 italic">No explicit risk scores identified.</p>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {selectedAnalysis.risk_scores.map((risk, idx) => (
                            <div
                              key={idx}
                              className="border border-sky-100 bg-sky-50 rounded-xl p-3 text-xs space-y-1"
                            >
                              <p className="font-semibold text-sky-800">{risk.name}</p>
                              {risk.value && (
                                <p className="text-slate-800">
                                  Value: <span className="font-semibold">{risk.value}</span>
                                  {risk.risk_level && (
                                    <span className="ml-2 text-[11px] uppercase text-sky-700 font-semibold">
                                      ({risk.risk_level})
                                    </span>
                                  )}
                                </p>
                              )}
                              {risk.drivers && risk.drivers.length > 0 && (
                                <p className="text-slate-600">
                                  Drivers: {risk.drivers.join(', ')}
                                </p>
                              )}
                              {risk.recommended_followup && (
                                <p className="text-sky-800 font-medium">
                                  Follow‑up: {risk.recommended_followup}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Other Findings */}
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800 mb-2">Other Key Findings</h5>
                      {(!selectedAnalysis.other_findings || selectedAnalysis.other_findings.length === 0) ? (
                        <p className="text-xs text-slate-500 italic">No additional findings highlighted.</p>
                      ) : (
                        <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                          {selectedAnalysis.other_findings.map((item, idx) => (
                            <li key={idx}>
                              {item.category && (
                                <span className="font-semibold mr-1">{item.category}:</span>
                              )}
                              {item.detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Extracted Text Section */}
              <section>
                <h4 className="text-blue-700 font-semibold mb-3 flex items-center gap-2">
                  <FileText size={18} /> Extracted Document Text
                </h4>
                <div className="space-y-4">
                  {Object.entries(selectedReport.extracted_data || {}).map(([page, paragraphs]) => (
                    <div key={page} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        {page.replace('_', ' ')}
                      </div>
                      <div className="p-4 space-y-3">
                        {Array.isArray(paragraphs) ? paragraphs.map((para, i) => (
                          <p key={i} className="text-slate-700 text-sm leading-relaxed">{para}</p>
                        )) : <p className="text-slate-400 text-sm italic">No text content found.</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowResultsModal(false)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboardPage;
