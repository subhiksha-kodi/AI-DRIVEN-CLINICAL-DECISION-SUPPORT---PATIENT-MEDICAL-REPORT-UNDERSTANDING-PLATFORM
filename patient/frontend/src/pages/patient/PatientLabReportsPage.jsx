import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  User,
  TrendingUp,
  Activity,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Loader2,
} from 'lucide-react';
import patientApi from '../../api/patientAxios';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  Label,
} from 'recharts';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/** Parse reference range string to { min, max }. Handles "12-16", "12 - 16", ">10", "<20", etc. */
function parseReferenceRange(refStr) {
  if (!refStr || typeof refStr !== 'string') return { min: null, max: null };
  const s = refStr.trim().replace(/\s+/g, ' ');
  const num = (x) => {
    const n = parseFloat(String(x).replace(/[,]/g, ''));
    return Number.isNaN(n) ? null : n;
  };
  if (/^[<>]\s*[\d.]+\s*$/.test(s)) {
    if (s.startsWith('>')) return { min: num(s.slice(1)), max: null };
    return { min: null, max: num(s.slice(1)) };
  }
  const rangeMatch = s.match(/^([\d.]+)\s*[-–—to]\s*([\d.]+)$/i);
  if (rangeMatch) return { min: num(rangeMatch[1]), max: num(rangeMatch[2]) };
  const twoNums = s.match(/([\d.]+)\s+([\d.]+)/);
  if (twoNums) return { min: num(twoNums[1]), max: num(twoNums[2]) };
  return { min: null, max: null };
}

/** Check if value is within range (inclusive). No range = treat as in range. */
function isInRange(value, refStr) {
  const { min, max } = parseReferenceRange(refStr);
  if (min == null && max == null) return true;
  const v = Number(value);
  if (Number.isNaN(v)) return true;
  if (min != null && v < min) return false;
  if (max != null && v > max) return false;
  return true;
}

/** Get elevated/lowered message for latest value vs reference range. Returns null if in range or no range. */
function getElevationMessage(testName, value, refStr) {
  const { min, max } = parseReferenceRange(refStr);
  const v = Number(value);
  if (Number.isNaN(v) || (min == null && max == null)) return null;
  if (min != null && max != null && v >= min && v <= max) return null;
  const name = testName || 'Value';
  if (max != null && v > max) {
    const pct = Math.round(((v - max) / max) * 100);
    return `${name} elevated by ${pct}%`;
  }
  if (min != null && v < min) {
    const pct = Math.round(((min - v) / min) * 100);
    return `${name} lowered by ${pct}%`;
  }
  return null;
}

/** Single tooltip for trend point: lab report date, value, unit, reference range, status (green/red). */
function TrendTooltip({ active, payload, label, unit = '', trendName = '' }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const ref = parseReferenceRange(p.reference_range);
  const status = p.inRange ? 'Within range' : (ref.min != null && p.value < ref.min ? 'Low' : 'High');
  const statusColor = p.inRange ? '#059669' : '#dc2626';
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        padding: '12px 14px',
        backgroundColor: '#fff',
        minWidth: 200,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: '#334155' }}>
        Lab report date: {p.dateLabel || label}
      </div>
      <div style={{ fontSize: 14, color: '#475569' }}>
        <strong>Value:</strong> {p.value}
        {unit ? ` ${unit}` : ''}
      </div>
      {p.reference_range && (
        <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>
          <strong>Reference range:</strong> {p.reference_range}
        </div>
      )}
      <div style={{ marginTop: 6, fontWeight: 600, color: statusColor }}>Status: {status}</div>
    </div>
  );
}

const PatientLabReportsPage = () => {
  const [labReports, setLabReports] = useState([]);
  const [trendData, setTrendData] = useState({ trends: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [extractingId, setExtractingId] = useState(null);
  const [extractingAll, setExtractingAll] = useState(false);
  const [selectedTestKey, setSelectedTestKey] = useState('');

  const fetchLabReports = async () => {
    setLoading(true);
    try {
      const { data } = await patientApi.get('/patient/lab-reports');
      setLabReports(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load lab reports');
      setLabReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    setTrendLoading(true);
    try {
      const { data } = await patientApi.get('/patient/trend-data');
      const next = data.data || { trends: [], reports: [] };
      setTrendData(next);
      const firstKey = next.trends?.[0]?.test_name ?? '';
      setSelectedTestKey((prev) => (next.trends?.some((t) => t.test_name === prev) ? prev : firstKey));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load trend data');
      setTrendData({ trends: [], reports: [] });
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchLabReports();
    fetchTrendData();
  }, []);

  const handleDownload = async (reportId, fileName) => {
    try {
      const response = await patientApi.get(`/patient/lab-reports/${reportId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed');
    }
  };

  const handleExtractAnalyze = async (reportId) => {
    setExtractingId(reportId);
    try {
      await patientApi.post(`/patient/lab-reports/${reportId}/extract-analyze`);
      toast.success('Extraction and analysis completed.');
      await fetchLabReports();
      await fetchTrendData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Extract & analyze failed');
    } finally {
      setExtractingId(null);
    }
  };

  const handleExtractAll = async () => {
    if (!labReports.length) return;
    setExtractingAll(true);
    let done = 0;
    let failed = 0;
    for (const r of labReports) {
      try {
        await patientApi.post(`/patient/lab-reports/${r.id}/extract-analyze`);
        done += 1;
      } catch {
        failed += 1;
      }
    }
    setExtractingAll(false);
    if (done) {
      toast.success(`${done} report(s) processed.`);
      await fetchLabReports();
      await fetchTrendData();
    }
    if (failed) toast.error(`${failed} report(s) failed.`);
  };

  const hasLabReports = labReports.length > 0;
  const trends = trendData.trends || [];
  const hasTrends = trends.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Lab Reports & Trend Analysis</h1>
        <p className="text-slate-500 text-sm mt-1">
          Reports sent from the hospital (by your Register Number) and trend over time
        </p>
      </div>

      {/* Lab Reports from Admin */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-sky-600" />
            <h2 className="font-semibold text-slate-800">Lab Reports (from Hospital)</h2>
          </div>
          <div className="flex items-center gap-2">
            {hasLabReports && (
              <button
                type="button"
                onClick={handleExtractAll}
                disabled={extractingAll || loading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {extractingAll ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Extract & Analyze all
              </button>
            )}
            <button
              type="button"
              onClick={fetchLabReports}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasLabReports ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <AlertCircle size={48} className="text-slate-300 mb-3" />
              <p className="font-medium">No lab reports found</p>
              <p className="text-sm mt-1 text-center max-w-sm">
                Reports uploaded by the admin with your Register Number and Name will appear here. Log in using
                Register Number + Name to see them.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="text-left px-4 py-3 font-medium">Report</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Doctor</th>
                    <th className="text-right px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {labReports.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.file_name}</td>
                      <td className="px-4 py-3 text-slate-600 flex items-center gap-1.5">
                        <Calendar size={14} />
                        {formatDate(r.uploaded_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 flex items-center gap-1.5">
                        <User size={14} />
                        {r.assigned_doctor}
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleExtractAnalyze(r.id)}
                          disabled={extractingId === r.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                          title="Extract and analyze this report (same as Report Analysis tab)"
                        >
                          {extractingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          Extract & Analyze
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(r.id, r.file_name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Trend Analysis — one graph per repeated test parameter */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" />
            <h2 className="font-semibold text-slate-800">Trend Analysis</h2>
          </div>
          <button
            type="button"
            onClick={fetchTrendData}
            disabled={trendLoading}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={trendLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="p-4">
          {trendLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasTrends ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Activity size={48} className="text-slate-300 mb-3" />
              <p className="font-medium">Need multiple reports for trend</p>
              <p className="text-sm mt-1 text-center max-w-sm">
                Trends are shown only for test parameters that appear in at least two reports. Run &quot;Extract &amp; Analyze&quot; on each report above, then upload more reports to see trends here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-slate-600 text-sm font-medium">Select test for trend:</label>
                <select
                  value={selectedTestKey}
                  onChange={(e) => setSelectedTestKey(e.target.value)}
                  className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[220px]"
                >
                  {trends.map((t) => (
                    <option key={t.test_name} value={t.test_name}>
                      {t.unit ? `${t.test_name} (${t.unit})` : t.test_name}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const trend = trends.find((t) => t.test_name === selectedTestKey);
                if (!trend) return null;
                const refStr = trend.reference_range || '';
                const points = (trend.values || [])
                  .map((p) => {
                    const value = typeof p.value === 'number' ? p.value : parseFloat(p.value) || 0;
                    const ref = p.reference_range || refStr;
                    const inRange = isInRange(value, ref);
                    const reportDate = p.date || '';
                    return {
                      ...p,
                      date: reportDate,
                      dateLabel: reportDate ? formatDate(reportDate) : '',
                      value,
                      reference_range: ref,
                      inRange,
                      valueNormal: inRange ? value : null,
                      valueAbnormal: !inRange ? value : null,
                    };
                  })
                  .sort((a, b) => new Date(a.date) - new Date(b.date));
                const title = trend.unit ? `${trend.test_name} (${trend.unit})` : trend.test_name;
                const { min, max } = parseReferenceRange(refStr);
                const latestValue = points.length ? points[points.length - 1].value : null;
                const elevationMessage = latestValue != null ? getElevationMessage(trend.test_name, latestValue, refStr) : null;
                const clinicalMeaning = trend.clinical_meaning || '';
                const possibleSymptoms = trend.possible_symptoms || [];

                return (
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <h3 className="text-slate-800 font-semibold mb-1">{title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-3">
                      {refStr && (
                        <p className="text-slate-600">
                          <span className="font-medium text-slate-700">Value range (reference):</span>{' '}
                          {refStr}
                        </p>
                      )}
                      {elevationMessage && (
                        <p className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {elevationMessage}
                        </p>
                      )}
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={points}
                          margin={{ top: 10, right: 24, left: 10, bottom: 24 }}
                          isAnimationActive
                          animationDuration={1200}
                          animationEasing="ease-in-out"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="date"
                            type="category"
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                            tickFormatter={(d) => (d ? formatDate(d) : '')}
                            interval={0}
                          />
                          <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                          <Tooltip
                            content={<TrendTooltip unit={trend.unit} trendName={trend.test_name} />}
                          />
                          <Legend
                            content={() => (
                              <div className="flex justify-center text-slate-600 text-sm mt-2">
                                <span style={{ color: '#059669' }}>●</span> Within range
                                <span className="mx-3" />
                                <span style={{ color: '#dc2626' }}>●</span> High/Low
                              </div>
                            )}
                          />
                          {(min != null || max != null) && (
                            <ReferenceArea
                              y1={min !== null ? min : undefined}
                              y2={max !== null ? max : undefined}
                              strokeOpacity={0}
                              fill="#059669"
                              fillOpacity={0.12}
                            >
                              <Label
                                value="Normal Range"
                                position="insideBottomLeft"
                                fill="#059669"
                                fontSize={10}
                                fontWeight="bold"
                                offset={10}
                                style={{ opacity: 0.8 }}
                              />
                            </ReferenceArea>
                          )}
                          {/* Base continuous line for trend (neutral color) */}
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="Trend"
                            stroke="#64748b"
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls
                            isAnimationActive
                            animationDuration={1200}
                          />
                          {/* Green dots/segments for within-range values */}
                          <Line
                            type="monotone"
                            dataKey="valueNormal"
                            name="Within range"
                            stroke="#059669"
                            strokeWidth={0}
                            dot={{ r: 5, fill: '#059669', strokeWidth: 0 }}
                            activeDot={{ r: 7, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                            connectNulls
                            isAnimationActive
                            animationDuration={1200}
                          />
                          {/* Red dots/segments for abnormal values */}
                          <Line
                            type="monotone"
                            dataKey="valueAbnormal"
                            name="High/Low"
                            stroke="#dc2626"
                            strokeWidth={0}
                            dot={{ r: 5, fill: '#dc2626', strokeWidth: 0 }}
                            activeDot={{ r: 7, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }}
                            connectNulls
                            isAnimationActive
                            animationDuration={1200}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {(clinicalMeaning || possibleSymptoms.length > 0) && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                        {clinicalMeaning && (
                          <div>
                            <h4 className="text-slate-700 font-semibold text-sm mb-1">Clinical meaning</h4>
                            <p className="text-slate-600 text-sm">{clinicalMeaning}</p>
                          </div>
                        )}
                        {possibleSymptoms.length > 0 && (
                          <div>
                            <h4 className="text-slate-700 font-semibold text-sm mb-1">Possible symptoms</h4>
                            <ul className="text-slate-600 text-sm list-disc list-inside space-y-0.5">
                              {possibleSymptoms.map((s, i) => (
                                <li key={i}>{typeof s === 'string' ? s : s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientLabReportsPage;
