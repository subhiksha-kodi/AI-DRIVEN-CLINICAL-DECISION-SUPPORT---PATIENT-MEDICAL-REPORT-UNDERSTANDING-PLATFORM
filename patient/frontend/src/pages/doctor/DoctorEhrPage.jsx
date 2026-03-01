import { useState, useEffect, useRef } from 'react';
import {
  Search, Activity, AlertTriangle, AlertCircle, CheckCircle,
  User, Heart, Pill, Hospital, Shield, DollarSign, Stethoscope,
  Loader2, FileText, TrendingUp, Upload, X, Image, Zap, Brain,
  Beaker, ShieldAlert, BarChart3
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

// ─── Alert Card Component ─────────────────────────────────────────────────────
const AlertCard = ({ alert }) => {
  const severityConfig = {
    HIGH: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', title: 'text-red-700', desc: 'text-red-600' },
    MODERATE: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', title: 'text-amber-700', desc: 'text-amber-600' },
    LOW: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', title: 'text-blue-700', desc: 'text-blue-600' },
  };
  const config = severityConfig[alert.severity] || severityConfig.LOW;
  const Icon = alert.severity === 'HIGH' ? AlertTriangle : AlertCircle;

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className={`${config.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${config.title}`}>{alert.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.title}`}>
              {alert.type.replace(/_/g, ' ')}
            </span>
          </div>
          <p className={`text-sm ${config.desc}`}>{alert.description}</p>
          {alert.recommendation && (
            <p className={`text-sm mt-2 font-medium ${config.title}`}>
              Recommendation: {alert.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Risk Score Card Component ────────────────────────────────────────────────
const RiskScoreCard = ({ label, value, color }) => {
  const getColor = (val) => {
    if (val < 20) return 'bg-emerald-500';
    if (val < 40) return 'bg-yellow-500';
    if (val < 60) return 'bg-amber-500';
    if (val < 80) return 'bg-orange-500';
    return 'bg-red-500';
  };
  const barColor = color || getColor(value || 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-600 font-medium text-sm">{label}</span>
        <span className="text-lg font-bold text-slate-800">{value ?? 0}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(value || 0, 100)}%` }}
        />
      </div>
    </div>
  );
};

// ─── Medication Card Component ────────────────────────────────────────────────
const MedicationCard = ({ med }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
          <Pill size={20} className="text-violet-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">{med.medicationName}</p>
          <p className="text-sm text-slate-500">{med.dosage}</p>
        </div>
      </div>
      {med.confidence && (
        <span className={`text-xs px-2 py-1 rounded-full ${
          med.confidence >= 90 ? 'bg-emerald-100 text-emerald-700' :
          med.confidence >= 70 ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {med.confidence}% conf
        </span>
      )}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-slate-400">Frequency:</span>
        <span className="ml-1 text-slate-700">{med.frequency}</span>
      </div>
      {med.duration && (
        <div>
          <span className="text-slate-400">Duration:</span>
          <span className="ml-1 text-slate-700">{med.duration}</span>
        </div>
      )}
    </div>
    {med.instructions && (
      <p className="mt-2 text-xs text-slate-500 italic">{med.instructions}</p>
    )}
  </div>
);

// ─── Lab Result Row Component ─────────────────────────────────────────────────
const LabResultRow = ({ lab }) => {
  const statusConfig = {
    NORMAL: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    HIGH: { bg: 'bg-red-100', text: 'text-red-700' },
    LOW: { bg: 'bg-amber-100', text: 'text-amber-700' },
    CRITICAL: { bg: 'bg-red-200', text: 'text-red-800' },
  };
  const config = statusConfig[lab.status] || statusConfig.NORMAL;

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <p className="font-medium text-slate-800">{lab.testName}</p>
        <p className="text-xs text-slate-500">Ref: {lab.referenceRange || 'N/A'}</p>
      </div>
      <div className="text-right">
        <span className="font-bold text-slate-800">{lab.value} {lab.unit}</span>
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
          {lab.status}
        </span>
      </div>
    </div>
  );
};

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

  // Extraction state
  const [extracting, setExtracting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [extractionResult, setExtractionResult] = useState(null);
  const [activeTab, setActiveTab] = useState('analyze'); // 'analyze' or 'extract'
  const fileInputRef = useRef(null);

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (uploadedImages.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    try {
      const newImages = await Promise.all(
        files.map(async (file) => ({
          file,
          base64: await fileToBase64(file),
          mimeType: file.type,
          name: file.name,
          preview: URL.createObjectURL(file)
        }))
      );
      setUploadedImages(prev => [...prev, ...newImages]);
    } catch (err) {
      toast.error('Failed to process images');
    }
  };

  // Remove uploaded image
  const removeImage = (index) => {
    setUploadedImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // Handle Extract & Analyze
  const handleExtractAnalyze = async () => {
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setExtracting(true);
    setExtractionResult(null);
    setError(null);

    try {
      const images = uploadedImages.map(img => ({
        base64: img.base64,
        mimeType: img.mimeType
      }));

      const { data } = await doctorApi.post('/doctor/ehr/extract-analyze', {
        patient_id: searchQuery.trim() || null,
        images
      });

      setExtractionResult(data.data);
      toast.success('Extraction and analysis complete!');
    } catch (err) {
      const message = err.response?.data?.message || 'Extraction failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setExtracting(false);
    }
  };

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
          EHR Analysis & Extraction
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Analyze patient records or extract data from medical documents</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('analyze')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition ${
              activeTab === 'analyze'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Stethoscope size={20} />
            Patient Analysis
          </button>
          <button
            onClick={() => setActiveTab('extract')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition ${
              activeTab === 'extract'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Zap size={20} />
            Extract & Analyze
          </button>
        </div>
      </div>

      {/* Search Section - For both tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex gap-4">
          <div className="flex-1 relative" ref={searchRef}>
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Enter Patient ID (optional for extraction)..."
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
          {activeTab === 'analyze' && (
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
          )}
        </div>

        {/* Image Upload Section - Only for Extract tab */}
        {activeTab === 'extract' && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload Medical Documents (Prescriptions, Lab Reports)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/jpeg,image/png,image/jpg,image/webp"
              multiple
              className="hidden"
            />
            
            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition"
            >
              <Upload size={40} className="mx-auto text-slate-400 mb-2" />
              <p className="text-slate-600 font-medium">Click to upload images</p>
              <p className="text-slate-400 text-sm mt-1">JPEG, PNG, WebP • Max 5 images</p>
            </div>

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Uploaded Images ({uploadedImages.length}/5)
                </p>
                <div className="flex flex-wrap gap-3">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.preview}
                        alt={img.name}
                        className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(idx);
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X size={14} />
                      </button>
                      <p className="text-xs text-slate-500 truncate w-24 mt-1">{img.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extract & Analyze Button */}
            <button
              onClick={handleExtractAnalyze}
              disabled={extracting || uploadedImages.length === 0}
              className="mt-4 w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {extracting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Analyzing with Gemini AI...
                </>
              ) : (
                <>
                  <Brain size={20} />
                  Extract & Analyze
                </>
              )}
            </button>
            
            {searchQuery.trim() && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                Results will be compared against EHR data for patient: <span className="font-medium">{searchQuery}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && !analyzing && !extracting && (
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

      {/* Extraction Loading State */}
      {extracting && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl shadow-sm border border-violet-200 p-12 text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <Brain size={48} className="mx-auto text-violet-600 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          </div>
          <p className="text-violet-700 font-medium">Gemini AI is analyzing your documents...</p>
          <p className="text-violet-500 text-sm mt-1">Extracting text, detecting medications, and checking for interactions</p>
        </div>
      )}

      {/* Extraction Results */}
      {extractionResult && !extracting && activeTab === 'extract' && (
        <>
          {/* Header with Document Info */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-violet-200 text-sm">Document Analysis Complete</p>
                <p className="text-2xl font-bold mt-1">
                  {extractionResult.documentType?.replace(/_/g, ' ') || 'Medical Document'}
                </p>
                <div className="flex items-center gap-4 mt-3 text-violet-200">
                  <span>{extractionResult.image_count} image(s) analyzed</span>
                  {extractionResult.ehr_context_used && (
                    <span className="flex items-center gap-1">
                      <CheckCircle size={14} />
                      EHR context applied
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-violet-200 text-xs">Confidence</p>
                <p className="text-3xl font-bold">{extractionResult.confidence || 0}%</p>
              </div>
            </div>
          </div>

          {/* Safety Alerts - Shown first for visibility */}
          {extractionResult.alerts && extractionResult.alerts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={20} className="text-amber-600" />
                <h2 className="text-lg font-bold text-slate-800">Safety Alerts</h2>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  {extractionResult.alerts.length} alert(s)
                </span>
              </div>
              {extractionResult.alerts.map((alert, idx) => (
                <AlertCard key={idx} alert={alert} />
              ))}
            </div>
          )}

          {/* Risk Assessment Grid */}
          {extractionResult.riskScores && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={20} className="text-violet-600" />
                <h2 className="text-lg font-bold text-slate-800">Risk Assessment</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <RiskScoreCard label="Cardiovascular Risk" value={extractionResult.riskScores.cardiovascularRisk} />
                <RiskScoreCard label="Diabetes Risk" value={extractionResult.riskScores.diabetesRisk} />
                <RiskScoreCard label="Kidney Risk" value={extractionResult.riskScores.kidneyRisk} />
                <RiskScoreCard label="Liver Risk" value={extractionResult.riskScores.liverRisk} />
                <RiskScoreCard label="Drug Interaction Risk" value={extractionResult.riskScores.drugInteractionRisk} />
                <RiskScoreCard label="Overall Risk" value={extractionResult.riskScores.overallRisk} />
              </div>
            </div>
          )}

          {/* Parsed Prescription */}
          {extractionResult.parsedPrescription && extractionResult.parsedPrescription.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Pill size={20} className="text-violet-600" />
                <h2 className="text-lg font-bold text-slate-800">Extracted Medications</h2>
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                  {extractionResult.parsedPrescription.length} medication(s)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extractionResult.parsedPrescription.map((med, idx) => (
                  <MedicationCard key={idx} med={med} />
                ))}
              </div>
            </div>
          )}

          {/* Parsed Lab Results */}
          {extractionResult.parsedLabResults && extractionResult.parsedLabResults.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Beaker size={20} className="text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">Lab Results</h2>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {extractionResult.parsedLabResults.length} test(s)
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {extractionResult.parsedLabResults.map((lab, idx) => (
                  <LabResultRow key={idx} lab={lab} />
                ))}
              </div>
            </div>
          )}

          {/* Patient Summary */}
          {extractionResult.patientSummary && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={20} className="text-violet-600" />
                <h2 className="text-lg font-bold text-slate-800">Clinical Summary</h2>
                <span className="ml-auto text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                  Gemini AI Generated
                </span>
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap">{extractionResult.patientSummary}</p>
              </div>
            </div>
          )}

          {/* Extracted Raw Text */}
          {extractionResult.extractedText && (
            <details className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-medium text-slate-700 flex items-center gap-2">
                <FileText size={16} />
                View Extracted Text
              </summary>
              <pre className="mt-4 text-sm text-slate-600 whitespace-pre-wrap font-mono bg-white p-4 rounded-lg border border-slate-200">
                {extractionResult.extractedText}
              </pre>
            </details>
          )}
        </>
      )}

      {/* Patient Analysis Results */}
      {result && !analyzing && activeTab === 'analyze' && (
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

          {/* Financial Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <DollarSign size={16} />
                Income
              </div>
              <p className="text-xl font-bold text-slate-800">
                ${Number(result.summary.income || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <TrendingUp size={16} />
                Healthcare Expenses
              </div>
              <p className="text-xl font-bold text-slate-800">
                ${Number(result.summary.healthcare_expenses || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Shield size={16} />
                Healthcare Coverage
              </div>
              <p className="text-xl font-bold text-slate-800">
                ${Number(result.summary.healthcare_coverage || 0).toLocaleString()}
              </p>
            </div>
          </div>

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

      {/* Empty State - Analyze Tab */}
      {activeTab === 'analyze' && !result && !analyzing && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Search size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Enter a Patient ID to begin analysis</p>
          <p className="text-slate-400 text-sm mt-1">
            The system will retrieve patient data and provide a comprehensive clinical analysis
          </p>
        </div>
      )}

      {/* Empty State - Extract Tab */}
      {activeTab === 'extract' && !extractionResult && !extracting && !error && uploadedImages.length === 0 && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl shadow-sm border border-violet-200 p-12 text-center">
          <Brain size={48} className="mx-auto text-violet-400 mb-4" />
          <p className="text-violet-700 font-medium">Upload medical documents to begin extraction</p>
          <p className="text-violet-500 text-sm mt-1">
            Gemini AI will extract medications, lab results, and detect potential drug interactions
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-violet-600">
            <span className="px-3 py-1 bg-white rounded-full border border-violet-200">Handwriting Recognition</span>
            <span className="px-3 py-1 bg-white rounded-full border border-violet-200">Drug Interaction Check</span>
            <span className="px-3 py-1 bg-white rounded-full border border-violet-200">Risk Assessment</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorEhrPage;
