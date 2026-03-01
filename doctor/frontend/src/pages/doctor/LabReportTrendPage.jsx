import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Activity, FileText, ChevronRight, Loader2,
  Calendar, AlertCircle, Info, TrendingUp, User
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea
} from 'recharts';
import doctorApi from '../../api/doctorAxios';
import toast from 'react-hot-toast';

// ─── Reference Range Helper Logic ───────────────────────────────────────────
const parseReferenceRange = (refStr) => {
  if (!refStr) return { min: null, max: null };

  // Handle ">10", "<20", ">=10"
  if (/^[<>]=?\s*[\d.]+$/.test(refStr)) {
    const value = parseFloat(refStr.replace(/[<>=]/g, '').trim());
    if (refStr.startsWith('>')) return { min: value, max: null };
    if (refStr.startsWith('<')) return { min: null, max: value };
  }

  // Handle "12-16", "12 - 16", "12 to 16"
  const rangeMatch = refStr.match(/^([\d.]+)\s*[-–—to]\s*([\d.]+)$/i);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2])
    };
  }

  return { min: null, max: null };
};

const isInRange = (value, refStr) => {
  const { min, max } = parseReferenceRange(refStr);
  if (min === null && max === null) return true;
  const v = Number(value);
  if (min !== null && v < min) return false;
  if (max !== null && v > max) return false;
  return true;
};

// ─── Custom Tooltip Component ───────────────────────────────────────────────
const TrendTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  const ref = parseReferenceRange(p.reference_range);
  const status = p.inRange ? 'Within range' :
    (ref.min !== null && p.value < ref.min ? 'Low' : 'High');
  const statusColor = p.inRange ? '#059669' : '#dc2626';

  return (
    <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-sm">
      <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-1">
        <Calendar size={14} className="text-slate-400" />
        <span className="font-bold text-slate-700">{new Date(p.date).toLocaleDateString()}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Value:</span>
          <span className="font-semibold text-slate-800">{p.value} {unit}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Reference:</span>
          <span className="text-slate-700">{p.reference_range || 'N/A'}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-slate-50 mt-1">
          <span className="text-slate-500">Status:</span>
          <span className="font-bold" style={{ color: statusColor }}>{status}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page Component ───────────────────────────────────────────────────
const LabReportTrendPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendData, setTrendData] = useState({ trends: [], reports: [] });
  const [selectedTestKey, setSelectedTestKey] = useState('');
  const [showSearch, setShowSearch] = useState(true);

  // Initial fetch of common patients
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async (query = '') => {
    setLoadingPatients(true);
    try {
      const { data } = await doctorApi.get('/doctor/patients', {
        params: { search: query, limit: 10 }
      });
      setPatients(data.data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
      toast.error('Failed to load patients');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setShowSearch(false);
    setLoadingTrends(true);
    try {
      const { data } = await doctorApi.get('/doctor/trend-data', {
        params: {
          registration_number: patient.registration_number,
          patient_name: patient.patient_name
        }
      });
      setTrendData(data.data || { trends: [], reports: [] });
      if (data.data?.trends?.length > 0) {
        setSelectedTestKey(data.data.trends[0].test_name);
      } else {
        setSelectedTestKey('');
      }
    } catch (err) {
      console.error('Error fetching trend data:', err);
      toast.error('Failed to load trend data');
    } finally {
      setLoadingTrends(false);
    }
  };

  const activeTrend = trendData.trends.find(t => t.test_name === selectedTestKey);

  const chartPoints = (activeTrend?.values || []).map(p => {
    const value = typeof p.value === 'number' ? p.value : parseFloat(p.value) || 0;
    const refStr = p.reference_range || activeTrend.reference_range;
    const inRange = isInRange(value, refStr);

    return {
      ...p,
      value,
      reference_range: refStr,
      inRange,
      valueNormal: inRange ? value : null,
      valueAbnormal: !inRange ? value : null,
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const { min, max } = parseReferenceRange(activeTrend?.reference_range);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" size={28} />
            Lab Report Trend Analysis
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Visualize physiological trends across multiple lab reports</p>
        </div>
        {selectedPatient && (
          <button
            onClick={() => {
              setShowSearch(true);
              setSelectedPatient(null);
            }}
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
          >
            Change Patient
          </button>
        )}
      </div>

      {showSearch && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="relative mb-6">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients by name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchPatients(e.target.value);
              }}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingPatients ? (
              <div className="md:col-span-2 flex justify-center py-10">
                <Loader2 size={32} className="text-emerald-500 animate-spin" />
              </div>
            ) : patients.length > 0 ? (
              patients.map(p => (
                <button
                  key={p.registration_number}
                  onClick={() => handlePatientSelect(p)}
                  className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition text-left group"
                >
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold group-hover:bg-emerald-200">
                    {p.patient_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{p.patient_name}</p>
                    <p className="text-sm text-slate-500">ID: {p.registration_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                      {p.total_reports} Reports
                    </p>
                    <ChevronRight size={18} className="text-slate-300 ml-auto mt-2" />
                  </div>
                </button>
              ))
            ) : (
              <div className="md:col-span-2 text-center py-10 text-slate-400">
                No patients found
              </div>
            )}
          </div>
        </div>
      )}

      {selectedPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Info Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-50" />
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                  {selectedPatient.patient_name.charAt(0)}
                </div>
                <h2 className="text-xl font-bold text-slate-800">{selectedPatient.patient_name}</h2>
                <p className="text-slate-500 text-sm">{selectedPatient.registration_number}</p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">Total Reports</span>
                  <span className="font-bold text-slate-800">{trendData.reports.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm p-3 bg-emerald-50 rounded-xl">
                  <span className="text-emerald-600">Trendable Params</span>
                  <span className="font-bold text-emerald-700">{trendData.trends.length}</span>
                </div>
              </div>
            </div>

            {/* Test Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Available Trends</h3>
              <div className="space-y-1">
                {trendData.trends.map(t => (
                  <button
                    key={t.test_name}
                    onClick={() => setSelectedTestKey(t.test_name)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${selectedTestKey === t.test_name
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedTestKey === t.test_name ? 'bg-white/20' : 'bg-slate-100'
                        }`}>
                        <Activity size={16} />
                      </div>
                      <span className="font-medium text-sm">{t.test_name}</span>
                    </div>
                    {selectedTestKey === t.test_name && <ChevronRight size={14} />}
                  </button>
                ))}
                {trendData.trends.length === 0 && !loadingTrends && (
                  <p className="text-center py-4 text-slate-400 text-sm">No trendable data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Graph Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[500px] flex flex-col">
              {loadingTrends ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 size={48} className="animate-spin mb-4 text-emerald-500" />
                  <p>Analyzing reports for trends...</p>
                </div>
              ) : activeTrend ? (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">{activeTrend.test_name}</h2>
                      <p className="text-slate-500 flex items-center gap-2">
                        Unit: {activeTrend.unit || 'Standard'} • Ref: {activeTrend.reference_range || 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                        NORMAL
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200">
                        <div className="w-2 h-2 rounded-full bg-red-600" />
                        ABNORMAL
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartPoints}
                        margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          dx={-10}
                        />
                        <Tooltip content={<TrendTooltip unit={activeTrend.unit} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />

                        {/* Reference range shading */}
                        {min != null && max != null && (
                          <ReferenceArea
                            y1={min} y2={max}
                            strokeOpacity={0.15}
                            fill="#059669"
                            fillOpacity={0.06}
                          />
                        )}

                        {/* Base trend line */}
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#64748b"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />

                        {/* Green dots for normal values */}
                        <Line
                          type="monotone"
                          dataKey="valueNormal"
                          stroke="#059669"
                          strokeWidth={0}
                          dot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                          activeDot={{ r: 8, fill: '#059669' }}
                          connectNulls
                        />

                        {/* Red dots for abnormal values */}
                        <Line
                          type="monotone"
                          dataKey="valueAbnormal"
                          stroke="#dc2626"
                          strokeWidth={0}
                          dot={{ r: 6, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }}
                          activeDot={{ r: 8, fill: '#dc2626' }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <Activity size={64} className="mb-4 text-slate-200" />
                  <p className="text-lg font-medium text-slate-500">Insufficient Trend Data</p>
                  <p className="text-sm max-w-sm text-center mt-2">
                    Trends require at least 2 reports with extraction results for the same test parameter.
                  </p>
                </div>
              )}
            </div>

            {/* Clinical Context */}
            {activeTrend && (activeTrend.clinical_meaning || activeTrend.possible_symptoms?.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="text-emerald-600" size={20} />
                  <h3 className="font-bold text-slate-800">Clinical Context</h3>
                </div>
                <p className="text-slate-600 leading-relaxed italic">
                  "{activeTrend.clinical_meaning}"
                </p>
                {activeTrend.possible_symptoms?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Potential Symptoms to Observe</p>
                    <div className="flex flex-wrap gap-2">
                      {activeTrend.possible_symptoms.map(s => (
                        <span key={s} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Source Reports */}
            {activeTrend && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-emerald-600" size={20} />
                  <h3 className="font-bold text-slate-800">Source Reports</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {trendData.reports.map(r => (
                    <div
                      key={r.report_id}
                      className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{r.file_name}</p>
                        <p className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty Initial State */}
      {!selectedPatient && !loadingPatients && patients.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-20 text-center">
          <User size={64} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-xl font-bold text-slate-800">No Patient Activity Yet</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Upload and analyze lab reports for your patients to see historical trends and physiological progressions.
          </p>
        </div>
      )}
    </div>
  );
};

export default LabReportTrendPage;
