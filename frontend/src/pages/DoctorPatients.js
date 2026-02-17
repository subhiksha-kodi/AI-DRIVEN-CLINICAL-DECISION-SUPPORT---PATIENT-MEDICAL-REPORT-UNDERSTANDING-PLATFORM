import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDoctorPatients } from '../services/doctorApi';
import {
  Users,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const limit = 10;

  useEffect(() => {
    fetchPatients();
  }, [page]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await getDoctorPatients(page, limit);
      setPatients(data.patients || []);
      setTotalPages(Math.ceil((data.total || 0) / limit));
    } catch (error) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (registerNumber) => {
    navigate('/doctor/dashboard', { state: { searchQuery: registerNumber } });
  };

  const filteredPatients = patients.filter(patient => 
    patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.register_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="doctor-patients">
      <div className="page-header">
        <h1>
          <Users size={24} />
          My Patients
        </h1>
        <p>View and manage your assigned patients</p>
      </div>

      {/* Search Bar */}
      <div className="search-bar card">
        <div className="search-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name or registration number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="patients-table card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No Patients Found</h3>
            <p>You don't have any assigned patients yet.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Registration No.</th>
                <th>Patient Name</th>
                <th>Age</th>
                <th>Latest Report</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.register_number}</td>
                  <td>
                    <div className="patient-name">
                      <span className="avatar">
                        {patient.name?.charAt(0)?.toUpperCase() || 'P'}
                      </span>
                      {patient.name}
                    </div>
                  </td>
                  <td>{patient.age || '-'}</td>
                  <td>
                    {patient.latest_report ? (
                      <div className="report-date">
                        <FileText size={14} />
                        {new Date(patient.latest_report).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="no-report">No reports</span>
                    )}
                  </td>
                  <td>
                    {patient.report_reviewed ? (
                      <span className="status-badge reviewed">
                        <CheckCircle size={14} />
                        Reviewed
                      </span>
                    ) : patient.latest_report ? (
                      <span className="status-badge pending">
                        <Clock size={14} />
                        Pending
                      </span>
                    ) : (
                      <span className="status-badge none">-</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleViewReport(patient.register_number)}
                      disabled={!patient.latest_report}
                    >
                      <Eye size={14} />
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorPatients;
