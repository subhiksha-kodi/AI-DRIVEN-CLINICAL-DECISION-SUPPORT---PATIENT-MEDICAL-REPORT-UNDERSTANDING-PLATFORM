import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import { 
  getDoctorStats, 
  getPatientReport, 
  extractReportData,
  markReportReviewed 
} from '../services/doctorApi';
import {
  Users,
  FileCheck,
  Clock,
  Search,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Pill,
  Beaker,
  AlertCircle
} from 'lucide-react';

const DoctorDashboard = () => {
  const { doctor } = useDoctorAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentReport, setCurrentReport] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getDoctorStats();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.warning('Please enter a registration number');
      return;
    }

    setSearchLoading(true);
    setCurrentReport(null);
    setExtractedData(null);

    try {
      const data = await getPatientReport(searchQuery.trim());
      setCurrentReport(data);
      
      if (data.extracted_data) {
        setExtractedData(data.extracted_data);
      }
      
      toast.success('Report found');
    } catch (error) {
      const message = error.response?.data?.detail || 'Report not found';
      toast.error(message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!currentReport) return;
    
    setExtracting(true);
    try {
      const data = await extractReportData(currentReport.report_id);
      setExtractedData(data.extracted_data);
      toast.success('Report data extracted successfully');
    } catch (error) {
      toast.error('Extraction failed. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!currentReport) return;
    
    try {
      await markReportReviewed(currentReport.report_id);
      setCurrentReport({ ...currentReport, is_reviewed: true });
      fetchStats(); // Refresh stats
      toast.success('Report marked as reviewed');
    } catch (error) {
      toast.error('Failed to mark report as reviewed');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'danger';
      case 'moderate': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="trend-icon up" />;
      case 'decreasing': return <TrendingDown className="trend-icon down" />;
      default: return <Minus className="trend-icon stable" />;
    }
  };

  return (
    <div className="doctor-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1>Welcome back, Dr. {doctor?.name?.split(' ').pop() || 'Doctor'}</h1>
        <p>Here's an overview of your clinical activities</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon patients">
            <Users />
          </div>
          <div className="stat-content">
            <h3>{loading ? '-' : stats?.assigned_patients || 0}</h3>
            <p>Assigned Patients</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon reviewed">
            <FileCheck />
          </div>
          <div className="stat-content">
            <h3>{loading ? '-' : stats?.reports_reviewed || 0}</h3>
            <p>Reports Reviewed</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock />
          </div>
          <div className="stat-content">
            <h3>{loading ? '-' : stats?.pending_review || 0}</h3>
            <p>Pending Review</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon activity">
            <Activity />
          </div>
          <div className="stat-content">
            <h3>{loading ? '-' : stats?.total_extractions || 0}</h3>
            <p>AI Extractions</p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section card">
        <h2>
          <Search size={20} />
          Search Patient Report
        </h2>
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Enter patient registration number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {/* Report Display Section */}
      {currentReport && (
        <div className="report-section">
          {/* Report Header */}
          <div className="report-header card">
            <div className="report-info">
              <h2>
                <FileText size={20} />
                Patient Report
              </h2>
              <div className="report-meta">
                <span className="patient-name">{currentReport.patient_name}</span>
                <span className="reg-number">Reg: {currentReport.registration_number}</span>
                <span className="report-date">
                  {new Date(currentReport.uploaded_at).toLocaleDateString()}
                </span>
                {currentReport.is_reviewed ? (
                  <span className="badge success">
                    <CheckCircle size={14} /> Reviewed
                  </span>
                ) : (
                  <span className="badge warning">
                    <Clock size={14} /> Pending Review
                  </span>
                )}
              </div>
            </div>
            <div className="report-actions">
              {!extractedData && (
                <button 
                  className="btn btn-primary"
                  onClick={handleExtract}
                  disabled={extracting}
                >
                  <Brain size={16} />
                  {extracting ? 'Extracting...' : 'Extract & Analyze'}
                </button>
              )}
              {extractedData && !currentReport.is_reviewed && (
                <button 
                  className="btn btn-success"
                  onClick={handleMarkReviewed}
                >
                  <CheckCircle size={16} />
                  Mark as Reviewed
                </button>
              )}
            </div>
          </div>

          {/* Extracted Data Display */}
          {extractedData && (
            <div className="extracted-data-grid">
              {/* Clinical Summary */}
              {extractedData.clinical_summary && (
                <div className="card clinical-summary">
                  <h3>
                    <AlertCircle size={18} />
                    Clinical Summary
                  </h3>
                  <div className={`risk-badge ${extractedData.clinical_summary.overall_risk}`}>
                    Overall Risk: {extractedData.clinical_summary.overall_risk?.toUpperCase()}
                  </div>
                  {extractedData.clinical_summary.key_findings?.length > 0 && (
                    <div className="key-findings">
                      <h4>Key Findings:</h4>
                      <ul>
                        {extractedData.clinical_summary.key_findings.map((finding, idx) => (
                          <li key={idx}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Lab Values */}
              {extractedData.lab_values?.length > 0 && (
                <div className="card lab-values">
                  <h3>
                    <Beaker size={18} />
                    Lab Values
                  </h3>
                  <div className="lab-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Value</th>
                          <th>Reference</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.lab_values.map((lab, idx) => (
                          <tr key={idx} className={lab.status !== 'normal' ? 'abnormal' : ''}>
                            <td>{lab.name}</td>
                            <td>{lab.value} {lab.unit}</td>
                            <td>{lab.reference_range || '-'}</td>
                            <td>
                              {lab.status === 'high' && (
                                <span className="status high">
                                  <TrendingUp size={14} /> High
                                </span>
                              )}
                              {lab.status === 'low' && (
                                <span className="status low">
                                  <TrendingDown size={14} /> Low
                                </span>
                              )}
                              {lab.status === 'normal' && (
                                <span className="status normal">
                                  <CheckCircle size={14} /> Normal
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Risk Indicators */}
              {extractedData.risk_indicators?.length > 0 && (
                <div className="card risk-indicators">
                  <h3>
                    <AlertTriangle size={18} />
                    Risk Indicators
                  </h3>
                  <div className="risk-list">
                    {extractedData.risk_indicators.map((risk, idx) => (
                      <div key={idx} className={`risk-item ${getSeverityColor(risk.severity)}`}>
                        <div className="risk-header">
                          <strong>{risk.marker}</strong>
                          <span className={`severity-badge ${risk.severity}`}>
                            {risk.severity}
                          </span>
                        </div>
                        <p>{risk.interpretation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drug Interactions */}
              {extractedData.drug_interactions?.length > 0 && (
                <div className="card drug-interactions">
                  <h3>
                    <Pill size={18} />
                    Drug Interactions
                  </h3>
                  <div className="interaction-list">
                    {extractedData.drug_interactions.map((interaction, idx) => (
                      <div key={idx} className={`interaction-item ${interaction.severity}`}>
                        <div className="drugs">
                          <span className="drug">{interaction.drug1}</span>
                          <XCircle size={14} />
                          <span className="drug">{interaction.drug2}</span>
                        </div>
                        <p>{interaction.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trends */}
              {extractedData.trends?.length > 0 && (
                <div className="card trends">
                  <h3>
                    <Activity size={18} />
                    Value Trends
                  </h3>
                  <div className="trends-list">
                    {extractedData.trends.map((trend, idx) => (
                      <div key={idx} className={`trend-item ${trend.status}`}>
                        <div className="trend-header">
                          {getTrendIcon(trend.trend)}
                          <strong>{trend.test}</strong>
                        </div>
                        <div className="trend-values">
                          <span>Previous: {trend.previous_value}</span>
                          <span>→</span>
                          <span>Current: {trend.current_value}</span>
                          <span className="change">({trend.change_percent > 0 ? '+' : ''}{trend.change_percent}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {extractedData.ai_summary && (
                <div className="card ai-summary full-width">
                  <h3>
                    <Brain size={18} />
                    AI Clinical Summary
                  </h3>
                  <div className="ai-content">
                    {extractedData.ai_summary.split('\n').map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications Found */}
              {extractedData.medications?.length > 0 && (
                <div className="card medications">
                  <h3>
                    <Pill size={18} />
                    Medications
                  </h3>
                  <div className="med-list">
                    {extractedData.medications.map((med, idx) => (
                      <div key={idx} className="med-item">
                        <strong>{med.name}</strong>
                        {med.dosage && <span className="dosage">{med.dosage}</span>}
                        {med.frequency && <span className="frequency">{med.frequency}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diseases/Conditions */}
              {extractedData.diseases?.length > 0 && (
                <div className="card diseases">
                  <h3>
                    <Activity size={18} />
                    Conditions Identified
                  </h3>
                  <div className="disease-tags">
                    {extractedData.diseases.map((disease, idx) => (
                      <span key={idx} className="disease-tag">
                        {disease.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
