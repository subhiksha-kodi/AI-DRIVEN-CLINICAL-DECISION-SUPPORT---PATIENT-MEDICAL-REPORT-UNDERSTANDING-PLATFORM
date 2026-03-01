/**
 * LabResultsPanel Component
 * Displays extracted lab results with risk alerts and severity indicators.
 */

import { useState, useEffect } from 'react';

// Severity color mapping
const severityColors = {
  CRITICAL: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-800',
    badge: 'bg-red-500 text-white',
    icon: '⚠️'
  },
  HIGH: {
    bg: 'bg-orange-100',
    border: 'border-orange-500',
    text: 'text-orange-800',
    badge: 'bg-orange-500 text-white',
    icon: '🔴'
  },
  MODERATE: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-500',
    text: 'text-yellow-800',
    badge: 'bg-yellow-500 text-white',
    icon: '🟠'
  },
  LOW: {
    bg: 'bg-blue-100',
    border: 'border-blue-500',
    text: 'text-blue-800',
    badge: 'bg-blue-500 text-white',
    icon: '🟡'
  },
  NORMAL: {
    bg: 'bg-green-100',
    border: 'border-green-500',
    text: 'text-green-800',
    badge: 'bg-green-500 text-white',
    icon: '✅'
  }
};

// Status badge component
const StatusBadge = ({ status }) => {
  const colors = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    LOW: 'bg-blue-100 text-blue-800 border-blue-200',
    NORMAL: 'bg-green-100 text-green-800 border-green-200',
  };
  
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${colors[status] || colors.NORMAL}`}>
      {status || 'N/A'}
    </span>
  );
};

// Alert card component
const AlertCard = ({ alert }) => {
  const style = severityColors[alert.severity] || severityColors.LOW;
  
  return (
    <div className={`${style.bg} ${style.border} border-l-4 p-4 rounded-r-lg mb-3`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${style.badge} px-2 py-0.5 rounded text-xs font-bold`}>
              {alert.severity}
            </span>
            <span className="font-semibold text-gray-900">{alert.test_name}</span>
          </div>
          <p className={`${style.text} text-sm mb-2`}>{alert.message}</p>
          <p className="text-gray-600 text-sm">
            <strong>Value:</strong> {alert.value} {alert.unit} | 
            <strong> Reference:</strong> {alert.reference_range}
          </p>
          {alert.recommendation && (
            <p className="text-gray-700 text-sm mt-2 italic">
              💡 {alert.recommendation}
            </p>
          )}
        </div>
        {alert.requires_immediate_attention && (
          <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
            URGENT
          </span>
        )}
      </div>
    </div>
  );
};

// Risk score meter component
const RiskMeter = ({ score, level }) => {
  const getColor = (score) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 50) return 'bg-orange-500';
    if (score >= 30) return 'bg-yellow-500';
    if (score > 0) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-700">Risk Assessment</h3>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${getColor(score)}`}>
          {level}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div 
          className={`h-4 rounded-full transition-all duration-500 ${getColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <p className="text-gray-500 text-sm mt-1">Risk Score: {score}/100</p>
    </div>
  );
};

// Lab results table component
const LabResultsTable = ({ results }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b">
        <h3 className="font-semibold text-gray-700">Lab Test Results</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference Range</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((result, index) => (
              <tr 
                key={index} 
                className={result.status === 'HIGH' || result.status === 'LOW' ? 'bg-red-50' : ''}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {result.test_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                  {result.value}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {result.unit}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {result.reference_range}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={result.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main LabResultsPanel component
const LabResultsPanel = ({ reportId, analysisData }) => {
  const [loading, setLoading] = useState(!analysisData);
  const [data, setData] = useState(analysisData || null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('alerts');

  useEffect(() => {
    if (!analysisData && reportId) {
      fetchAnalysis();
    }
  }, [reportId, analysisData]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/doctor/report/${reportId}/alerts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('doctorToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch analysis');
      
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded text-center">
        No analysis data available. Click "Extract & Analyze" to process this report.
      </div>
    );
  }

  const { alerts = [], risk_score = 0, risk_level = 'NORMAL', summary = '' } = data;
  const labResults = analysisData?.lab_tests || [];
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
  const otherAlerts = alerts.filter(a => a.severity !== 'CRITICAL');

  return (
    <div className="space-y-4">
      {/* Risk Score Meter */}
      <RiskMeter score={risk_score} level={risk_level} />

      {/* Summary */}
      {summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-1">Analysis Summary</h3>
          <p className="text-blue-700 text-sm">{summary}</p>
        </div>
      )}

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold">CRITICAL ALERTS DETECTED</h3>
              <p className="text-sm">{criticalAlerts.length} critical finding(s) require immediate attention</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === 'results'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Results ({labResults.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'alerts' && (
        <div>
          {alerts.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <span className="text-4xl mb-2 block">✅</span>
              <h3 className="font-semibold text-green-800">All Values Normal</h3>
              <p className="text-green-600 text-sm">No concerning findings in this report.</p>
            </div>
          ) : (
            <div>
              {criticalAlerts.map((alert, i) => (
                <AlertCard key={`critical-${i}`} alert={alert} />
              ))}
              {otherAlerts.map((alert, i) => (
                <AlertCard key={`other-${i}`} alert={alert} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <LabResultsTable results={labResults} />
      )}
    </div>
  );
};

export default LabResultsPanel;
