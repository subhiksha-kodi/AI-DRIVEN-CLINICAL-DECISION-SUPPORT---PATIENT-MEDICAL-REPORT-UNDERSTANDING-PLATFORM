import { useState, useEffect, useRef } from 'react';
import {
  Search, Activity, AlertTriangle, AlertCircle, CheckCircle,
  User, Heart, Pill, Hospital, Shield, Stethoscope,
  Loader2, FileText
} from 'lucide-react';
import doctorApi from '../../api/doctorAxios';
import toast from 'react-hot-toast';

// ─── Risk Level Badge ─────────────────────────────────────────────────────────
const RiskBadge = ({ level }) => {
  const config = {
    HIGH: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
    MODERATE: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle },
    LOW: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
  };
  const { bg, text, border, icon: Icon } = config[level] || config.LOW;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${bg} ${text} border ${border}`}>
      <Icon size={16} />
      {level} RISK
    </span>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, label, value, color, description }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
    <div className="flex items-start justify-between">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <span className="text-2xl font-bold text-slate-800">{value ?? '—'}</span>
    </div>
    <p className="text-slate-600 font-medium mt-3">{label}</p>
    {description && <p className="text-slate-400 text-xs mt-1">{description}</p>}
  </div>
);

// ─── Search Suggestion Item ───────────────────────────────────────────────────
const SuggestionItem = ({ patient, onSelect }) => (
  <button
    onClick={() => onSelect(patient.patient_id)}
    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
  >
    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
      <User size={16} className="text-emerald-600" />
    </div>
    <div>
      <p className="font-medium text-slate-800">{patient.patient_id}</p>
      <p className="text-xs text-slate-500">
        {patient.age ? `${patient.age} yrs` : ''} {patient.gender ? `• ${patient.gender}` : ''} {patient.city ? `• ${patient.city}, ${patient.state}` : ''}
      </p>
    </div>
  </button>
);

// ─── Doctor EHR Analysis Page ─────────────────────────────────────────────────
const DoctorEhrPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const searchRef = useRef(null);

  // Fetch suggestions as user types
  useEffect(() => {
    if (searchQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await doctorApi.get('/doctor/ehr/search', {
          params: { q: searchQuery }
        });
        setSuggestions(data.data || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Analyze patient
  const handleAnalyze = async (patientId) => {
    const id = patientId || searchQuery.trim();
    if (!id) {
      toast.error('Please enter a Patient ID');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setShowSuggestions(false);
    setSearchQuery(id);

    try {
      const { data } = await doctorApi.post('/doctor/ehr/analyze', { patient_id: id });
      setResult(data.data);
      toast.success('Analysis complete');
    } catch (err) {
      const message = err.response?.data?.message || 'Analysis failed. Please try again.';
      setError(message);
      setResult(null);
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectSuggestion = (patientId) => {
    setSearchQuery(patientId);
    setShowSuggestions(false);
    handleAnalyze(patientId);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  // Format analysis text with markdown-like rendering
  const renderAnalysis = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('###')) {
        return <h4 key={i} className="text-lg font-semibold text-slate-800 mt-6 mb-2">{line.replace(/^###\s*/, '')}</h4>;
      }
      if (line.startsWith('##')) {
        return <h3 key={i} className="text-xl font-bold text-slate-800 mt-6 mb-3">{line.replace(/^##\s*/, '')}</h3>;
      }
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const content = line.replace(/^[-•]\s*/, '');
        // Highlight warnings
        if (content.includes('⚠️') || content.toLowerCase().includes('risk') || content.toLowerCase().includes('high')) {
          return <li key={i} className="ml-4 text-slate-700 py-0.5 text-amber-700">{content}</li>;
        }
        return <li key={i} className="ml-4 text-slate-700 py-0.5">{content}</li>;
      }
      // Bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="text-slate-600 py-0.5">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-slate-800">{part}</strong> : part)}
          </p>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      // Regular text
      return <p key={i} className="text-slate-600 py-0.5">{line}</p>;
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Activity className="text-emerald-600" size={28} />
          EHR Analysis
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Search for a patient to analyze their health record</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex gap-4">
          <div className="flex-1 relative" ref={searchRef}>
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Enter Patient ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
                {suggestions.map(patient => (
                  <SuggestionItem
                    key={patient.patient_id}
                    patient={patient}
                    onSelect={handleSelectSuggestion}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={analyzing || !searchQuery.trim()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Stethoscope size={20} />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && !analyzing && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
          <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-700">Patient Not Found</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {analyzing && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Loader2 size={48} className="mx-auto text-emerald-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Analyzing patient data with AI...</p>
          <p className="text-slate-400 text-sm mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Results */}
      {result && !analyzing && (
        <>
          {/* Patient Summary Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Patient ID</p>
                <p className="text-3xl font-bold mt-1">{result.patient_id}</p>
                <div className="flex items-center gap-4 mt-3 text-emerald-100">
                  {result.summary.age && <span>{result.summary.age} years old</span>}
                  {result.summary.gender && <span>• {result.summary.gender}</span>}
                </div>
              </div>
              <RiskBadge level={result.risk_level} />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={Heart}
              label="Chronic Conditions"
              value={result.summary.chronic_conditions}
              color="bg-red-500"
              description={`${result.summary.total_conditions} total conditions`}
            />
            <SummaryCard
              icon={Pill}
              label="Medications"
              value={result.summary.total_medications}
              color="bg-violet-500"
              description={result.summary.total_medications >= 5 ? 'Polypharmacy risk' : 'Within normal range'}
            />
            <SummaryCard
              icon={Hospital}
              label="ER Visits"
              value={result.summary.emergency_visits}
              color="bg-amber-500"
              description={`${result.summary.inpatient_visits} inpatient visits`}
            />
            <SummaryCard
              icon={Shield}
              label="Wellness Visits"
              value={result.summary.wellness_visits}
              color="bg-emerald-500"
              description={`${result.summary.total_immunizations} immunizations`}
            />
          </div>

          {/* Financial Info removed: income, healthcare expenses, and coverage are not shown in analysis */}

          {/* AI Analysis */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-800">Clinical Analysis</h2>
              <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                AI Generated
              </span>
            </div>
            <div className="prose prose-slate max-w-none">
              {renderAnalysis(result.analysis)}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !analyzing && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Search size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Enter a Patient ID to begin analysis</p>
          <p className="text-slate-400 text-sm mt-1">
            The system will retrieve patient data and provide a comprehensive clinical analysis
          </p>
        </div>
      )}
    </div>
  );
};

export default DoctorEhrPage;
