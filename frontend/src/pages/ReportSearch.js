import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { 
  getPatientReport, 
  extractReportData,
  markReportReviewed 
} from '../services/doctorApi';
import {
  Search,
  FileText,
  Brain,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Beaker,
  Pill,
  Activity,
  XCircle,
  AlertCircle
} from 'lucide-react';

const ReportSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [extracting, setExtracting] = useState(false);

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
      const data = await extractReportData(currentReport.id);
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
      await markReportReviewed(currentReport.id);
      setCurrentReport({ ...currentReport, is_reviewed: true });
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

  return (
    <div className="report-search-page">
      <div className="page-header">
        <h1>
          <Search size={24} />
          Search Reports
        </h1>
        <p>Search patient reports by registration number</p>
      </div>

      {/* Search Section */}
      <div className="search-section card">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper large">
            <Search size={20} />
            <input
              type="text"
              placeholder="Enter patient registration number (e.g., REG001)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search Report'}
            </button>
          </div>
        </form>
      </div>

      {/* No Results Message */}
      {!currentReport && !searchLoading && searchQuery && (
        <div className="no-results card">
          <FileText size={48} />
          <h3>No Report Found</h3>
          <p>Try searching with a different registration number.</p>
        </div>
      )}

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
                <span className="patient-name">{currentReport.patient?.name}</span>
                <span className="reg-number">Reg: {currentReport.patient?.register_number}</span>
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

export default ReportSearch;
