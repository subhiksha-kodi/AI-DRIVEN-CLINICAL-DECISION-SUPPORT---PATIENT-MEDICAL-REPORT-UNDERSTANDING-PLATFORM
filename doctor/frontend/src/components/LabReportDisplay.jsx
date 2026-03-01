import React from 'react';

/**
 * LabReportDisplay - Displays extracted lab report data with proper formatting
 * Shows patient info, lab tests grouped by sections, and highlights abnormal values
 * 
 * Features:
 * - Patient info card with labeled fields
 * - Tests grouped by sections in tables
 * - RED highlighting for HIGH/LOW values
 * - 🚨 BLINKING CRITICAL ALERTS for dangerous values
 * - Alert cards with severity badges
 */
const LabReportDisplay = ({ data }) => {
  if (!data) return null;

  const { 
    patient_info, 
    lab_tests, 
    sections, 
    summary, 
    risk_analysis, 
    alerts,
    critical_alerts 
  } = data;

  // Get status color class
  const getStatusColor = (status, severity) => {
    if (severity === 'CRITICAL') {
      return 'text-red-700 font-extrabold animate-pulse';
    }
    switch (status?.toUpperCase()) {
      case 'HIGH':
        return 'text-red-600 font-bold';
      case 'LOW':
        return 'text-red-600 font-bold';
      default:
        return 'text-green-600';
    }
  };

  // Get severity badge color
  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-600 text-white animate-pulse';
      case 'HIGH':
        return 'bg-red-500 text-white';
      case 'MODERATE':
        return 'bg-orange-500 text-white';
      case 'WARNING':
        return 'bg-yellow-500 text-black';
      case 'LOW':
        return 'bg-yellow-400 text-black';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  // Get alert level badge
  const getAlertLevelBadge = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/50';
      case 'WARNING':
        return 'bg-orange-500 text-white';
      case 'NORMAL':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Format section name for display
  const formatSectionName = (section) => {
    return section
      ?.replace(/_/g, ' ')
      ?.replace(/\b\w/g, (c) => c.toUpperCase()) || 'General';
  };

  const hasCriticalAlerts = critical_alerts && critical_alerts.length > 0;
  const alertLevel = risk_analysis?.alert_level || 'NORMAL';

  return (
    <div className="space-y-6">
      {/* 🚨 CRITICAL ALERT BANNER - Blinking */}
      {hasCriticalAlerts && (
        <div className="bg-red-600 border-4 border-red-700 rounded-lg p-6 animate-pulse shadow-2xl shadow-red-500/50">
          <div className="flex items-center justify-center space-x-4">
            <span className="text-5xl">🚨</span>
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-white uppercase tracking-wider">
                Immediate Attention Required
              </h2>
              <p className="text-red-100 text-lg mt-1">
                {critical_alerts.length} Critical Value{critical_alerts.length > 1 ? 's' : ''} Detected
              </p>
            </div>
            <span className="text-5xl">🚨</span>
          </div>
          
          {/* Critical values list */}
          <div className="mt-4 space-y-2">
            {critical_alerts.map((alert, index) => (
              <div key={index} className="bg-red-700 rounded-lg p-3 flex items-center justify-between">
                <span className="font-bold text-white">{alert.test_name}</span>
                <span className="text-white text-xl font-extrabold">
                  {alert.value} {alert.unit}
                </span>
                <span className="text-red-200 text-sm">
                  Normal: {alert.reference_range}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Alert Level Badge */}
      {risk_analysis && (
        <div className={`rounded-lg p-4 ${
          alertLevel === 'CRITICAL' ? 'bg-red-50 border-2 border-red-500' :
          alertLevel === 'WARNING' ? 'bg-orange-50 border-2 border-orange-400' :
          'bg-green-50 border-2 border-green-400'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`px-4 py-2 rounded-lg text-lg font-bold ${getAlertLevelBadge(alertLevel)}`}>
                {alertLevel === 'CRITICAL' ? '🚨' : alertLevel === 'WARNING' ? '⚠️' : '✅'} {alertLevel}
              </span>
              <span className="text-gray-700">
                {risk_analysis.alert_message}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {risk_analysis.abnormal_count} of {risk_analysis.total_tests} tests abnormal
              </p>
              {risk_analysis.critical_count > 0 && (
                <p className="text-red-600 font-bold">
                  {risk_analysis.critical_count} CRITICAL
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Patient Information Card */}
      {patient_info && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            Patient Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {patient_info.name && (
              <div>
                <span className="text-gray-500 text-sm">Name:</span>
                <p className="font-semibold text-gray-800">{patient_info.name}</p>
              </div>
            )}
            {patient_info.age && (
              <div>
                <span className="text-gray-500 text-sm">Age:</span>
                <p className="font-semibold text-gray-800">{patient_info.age} Years</p>
              </div>
            )}
            {patient_info.sex && (
              <div>
                <span className="text-gray-500 text-sm">Sex:</span>
                <p className="font-semibold text-gray-800">{patient_info.sex}</p>
              </div>
            )}
            {patient_info.patient_id && (
              <div>
                <span className="text-gray-500 text-sm">Patient ID:</span>
                <p className="font-semibold text-gray-800">{patient_info.patient_id}</p>
              </div>
            )}
            {patient_info.reported_date && (
              <div>
                <span className="text-gray-500 text-sm">Report Date:</span>
                <p className="font-semibold text-gray-800">{patient_info.reported_date}</p>
              </div>
            )}
            {patient_info.referred_by && (
              <div>
                <span className="text-gray-500 text-sm">Referred By:</span>
                <p className="font-semibold text-gray-800">{patient_info.referred_by}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Card */}
      {summary && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            Report Summary
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-blue-600 text-2xl font-bold">{summary.total_tests}</span>
              <p className="text-blue-700 text-sm">Total Tests</p>
            </div>
            <div className={`px-4 py-2 rounded-lg ${summary.abnormal_count > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <span className={`text-2xl font-bold ${summary.abnormal_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.abnormal_count}
              </span>
              <p className={`text-sm ${summary.abnormal_count > 0 ? 'text-red-700' : 'text-green-700'}`}>
                Abnormal Values
              </p>
            </div>
            {risk_analysis?.critical_count > 0 && (
              <div className="px-4 py-2 rounded-lg bg-red-100 animate-pulse">
                <span className="text-red-700 text-2xl font-bold">{risk_analysis.critical_count}</span>
                <p className="text-red-800 text-sm font-bold">CRITICAL</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts Section - Non-Critical */}
      {alerts && alerts.length > 0 && (
        <div className={`rounded-lg shadow-md p-6 ${
          hasCriticalAlerts ? 'bg-orange-50 border-l-4 border-orange-500' : 'bg-red-50 border-l-4 border-red-500'
        }`}>
          <h2 className={`text-xl font-bold mb-4 flex items-center ${
            hasCriticalAlerts ? 'text-orange-700' : 'text-red-700'
          }`}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {hasCriticalAlerts ? 'Other Alerts' : 'Alerts & Recommendations'}
          </h2>
          <div className="space-y-4">
            {alerts.filter(a => a.severity !== 'CRITICAL').map((alert, index) => (
              <div key={index} className={`bg-white rounded-lg p-4 border ${
                alert.severity === 'HIGH' ? 'border-red-300' : 'border-orange-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-800">{alert.test_name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${getSeverityBadge(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </div>
                <div className={`font-semibold ${
                  alert.status === 'HIGH' || alert.status === 'LOW' ? 'text-red-600' : 'text-gray-700'
                }`}>
                  Value: {alert.value} {alert.unit} 
                  <span className="text-gray-500 ml-2">(Ref: {alert.reference_range})</span>
                </div>
                {alert.message && (
                  <p className="text-gray-600 text-sm mt-2">{alert.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lab Tests by Section */}
      {sections && Object.keys(sections).length > 0 ? (
        Object.entries(sections).map(([sectionName, tests]) => (
          <div key={sectionName} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
              {formatSectionName(sectionName)}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Test Name</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Value</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Unit</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Reference Range</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test, index) => {
                    const isCritical = critical_alerts?.some(ca => 
                      ca.test_name?.toUpperCase() === test.test_name?.toUpperCase()
                    );
                    const isAbnormal = test.status === 'HIGH' || test.status === 'LOW';
                    
                    return (
                      <tr key={index} className={`border-b hover:bg-gray-50 ${
                        isCritical ? 'bg-red-100 animate-pulse' : 
                        isAbnormal ? 'bg-red-50' : ''
                      }`}>
                        <td className={`py-3 px-4 ${isCritical ? 'text-red-800 font-bold' : 'text-gray-800'}`}>
                          {isCritical && <span className="mr-2">🚨</span>}
                          {test.test_name}
                        </td>
                        <td className={`py-3 px-4 text-center ${
                          isCritical ? 'text-red-700 font-extrabold animate-pulse text-lg' :
                          isAbnormal ? 'text-red-600 font-bold' : 'text-green-600'
                        }`}>
                          {test.value}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">{test.unit || '-'}</td>
                        <td className="py-3 px-4 text-center text-gray-600">{test.reference_range || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            isCritical ? 'bg-red-600 text-white animate-pulse' :
                            isAbnormal ? 'bg-red-100 text-red-700' : 
                            test.status === 'NORMAL' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {isCritical ? '🚨 CRITICAL' : test.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        /* Flat list if no sections */
        lab_tests && lab_tests.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
              Lab Test Results
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Test Name</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Value</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Unit</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Reference Range</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lab_tests.map((test, index) => {
                    const isCritical = critical_alerts?.some(ca => 
                      ca.test_name?.toUpperCase() === test.test_name?.toUpperCase()
                    );
                    const isAbnormal = test.status === 'HIGH' || test.status === 'LOW';
                    
                    return (
                      <tr key={index} className={`border-b hover:bg-gray-50 ${
                        isCritical ? 'bg-red-100 animate-pulse' : 
                        isAbnormal ? 'bg-red-50' : ''
                      }`}>
                        <td className={`py-3 px-4 ${isCritical ? 'text-red-800 font-bold' : 'text-gray-800'}`}>
                          {isCritical && <span className="mr-2">🚨</span>}
                          {test.test_name}
                        </td>
                        <td className={`py-3 px-4 text-center ${
                          isCritical ? 'text-red-700 font-extrabold animate-pulse text-lg' :
                          isAbnormal ? 'text-red-600 font-bold' : 'text-green-600'
                        }`}>
                          {test.value}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">{test.unit || '-'}</td>
                        <td className="py-3 px-4 text-center text-gray-600">{test.reference_range || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            isCritical ? 'bg-red-600 text-white animate-pulse' :
                            isAbnormal ? 'bg-red-100 text-red-700' : 
                            test.status === 'NORMAL' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {isCritical ? '🚨 CRITICAL' : test.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default LabReportDisplay;
