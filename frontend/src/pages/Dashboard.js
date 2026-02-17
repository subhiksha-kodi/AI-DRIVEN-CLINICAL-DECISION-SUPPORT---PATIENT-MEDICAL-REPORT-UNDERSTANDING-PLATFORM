import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  UserCog, 
  Users, 
  FileText, 
  Clock, 
  Upload, 
  Search,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getStats, 
  uploadReport, 
  getReports, 
  getReportsCount, 
  searchReports,
  getApprovedDoctors 
} from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_doctors: 0,
    total_patients: 0,
    total_reports: 0,
    recent_uploads: 0
  });
  const [reports, setReports] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Upload form state
  const [patientName, setPatientName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const limit = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, reportsData, countData, doctorsData] = await Promise.all([
        getStats(),
        getReports(currentPage, limit),
        getReportsCount(),
        getApprovedDoctors()
      ]);
      
      setStats(statsData);
      setReports(reportsData);
      setTotalReports(countData.total);
      setDoctors(doctorsData);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }

    setLoading(true);
    try {
      const results = await searchReports(searchQuery);
      setReports(results);
      setTotalReports(results.length);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!patientName || !regNumber || !selectedDoctor || !selectedFile) {
      toast.error('Please fill in all fields');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('patient_name', patientName);
      formData.append('registration_number', regNumber);
      formData.append('doctor_id', selectedDoctor);
      formData.append('file', selectedFile);

      await uploadReport(formData);
      
      toast.success('Report uploaded successfully!');
      
      // Reset form
      setPatientName('');
      setRegNumber('');
      setSelectedDoctor('');
      setSelectedFile(null);
      
      // Refresh data
      fetchData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const totalPages = Math.ceil(totalReports / limit);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-header-subtitle">Overview of your healthcare management system</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon doctors">
            <UserCog size={28} />
          </div>
          <div className="stat-info">
            <h3>{stats.total_doctors}</h3>
            <p>Total Doctors</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon patients">
            <Users size={28} />
          </div>
          <div className="stat-info">
            <h3>{stats.total_patients}</h3>
            <p>Total Patients</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon reports">
            <FileText size={28} />
          </div>
          <div className="stat-info">
            <h3>{stats.total_reports}</h3>
            <p>Total Reports</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon recent">
            <Clock size={28} />
          </div>
          <div className="stat-info">
            <h3>{stats.recent_uploads}</h3>
            <p>Recent Uploads (7 days)</p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card">
        <div className="card-header">
          <h3><Upload size={20} /> Upload Lab Report</h3>
        </div>
        <form className="upload-form" onSubmit={handleUpload}>
          <div className="form-group">
            <label>Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient name"
            />
          </div>
          
          <div className="form-group">
            <label>Registration Number</label>
            <input
              type="text"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="Enter registration number"
            />
          </div>
          
          <div className="form-group">
            <label>Assigned Doctor</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="">Select Doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.name} - {doctor.specialization}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Upload File</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept="*/*"
              />
              <div className="file-label">
                <Upload size={20} />
                <span>Choose File</span>
              </div>
              {selectedFile && (
                <p className="file-name">{selectedFile.name}</p>
              )}
            </div>
          </div>
          
          <button type="submit" className="btn btn-upload" disabled={uploading}>
            <Upload size={18} />
            {uploading ? 'Uploading...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {/* Search Section */}
      <div className="card">
        <div className="card-header">
          <h3><FileText size={20} /> Recently Uploaded Reports</h3>
          {totalReports > 0 && <span className="report-count">{totalReports} reports</span>}
        </div>
        
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by patient name, registration number, doctor, or file name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No reports found</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Registration No.</th>
                    <th>Assigned Doctor</th>
                    <th>File Name</th>
                    <th>Upload Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.patient_name}</td>
                      <td>{report.registration_number}</td>
                      <td>Dr. {report.doctor_name}</td>
                      <td>
                        <a 
                          href={`${API_BASE_URL}${report.file_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          download
                        >
                          <Download size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                          {report.file_name}
                        </a>
                      </td>
                      <td>{formatDate(report.uploaded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!searchQuery && totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
