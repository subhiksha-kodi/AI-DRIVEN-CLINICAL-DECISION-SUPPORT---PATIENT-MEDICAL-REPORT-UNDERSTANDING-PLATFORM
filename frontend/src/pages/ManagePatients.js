import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  Users,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getPatients, getPatientsCount } from '../services/api';

const ManagePatients = () => {
  const [patients, setPatients] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const limit = 10;

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const [patientsData, countData] = await Promise.all([
        getPatients(currentPage, limit, searchQuery),
        getPatientsCount(searchQuery)
      ]);
      
      setPatients(patientsData);
      setTotalPatients(countData.total);
    } catch (error) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchPatients();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const totalPages = Math.ceil(totalPatients / limit);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Manage Patients</h2>
          <p className="page-header-subtitle">View and manage patient records</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3><Users size={20} /> All Patients</h3>
          <span className="report-count">{totalPatients} total</span>
        </div>

        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by patient name or registration number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>No patients found</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Registration Number</th>
                    <th>Assigned Doctor</th>
                    <th>Total Reports</th>
                    <th>Registered On</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.name}</td>
                      <td>{patient.registration_number}</td>
                      <td>
                        {patient.assigned_doctor_name 
                          ? `Dr. ${patient.assigned_doctor_name}` 
                          : '-'}
                      </td>
                      <td>
                        <span className="report-count">
                          {patient.total_reports}
                        </span>
                      </td>
                      <td>{formatDate(patient.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
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

export default ManagePatients;
