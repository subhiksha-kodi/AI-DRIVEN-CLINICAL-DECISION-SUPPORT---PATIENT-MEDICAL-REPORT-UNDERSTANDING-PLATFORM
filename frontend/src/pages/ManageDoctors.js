import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  UserCog,
  Check,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getDoctors, 
  getDoctorsCount, 
  approveDoctor, 
  rejectDoctor 
} from '../services/api';

const ManageDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const limit = 10;

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const [doctorsData, countData] = await Promise.all([
        getDoctors(currentPage, limit),
        getDoctorsCount()
      ]);
      
      setDoctors(doctorsData);
      setTotalDoctors(countData.total);
    } catch (error) {
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleApprove = async (doctorId) => {
    setActionLoading(doctorId);
    try {
      await approveDoctor(doctorId);
      toast.success('Doctor approved successfully!');
      fetchDoctors();
    } catch (error) {
      toast.error('Failed to approve doctor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (doctorId) => {
    setActionLoading(doctorId);
    try {
      await rejectDoctor(doctorId);
      toast.success('Doctor rejected successfully!');
      fetchDoctors();
    } catch (error) {
      toast.error('Failed to reject doctor');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(totalDoctors / limit);

  const getStatusBadge = (status) => {
    const statusLower = status.toLowerCase();
    return (
      <span className={`status-badge ${statusLower}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>Manage Doctors</h2>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>All Doctors ({totalDoctors})</h3>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : doctors.length === 0 ? (
          <div className="empty-state">
            <UserCog size={48} />
            <p>No doctors registered yet</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Email</th>
                    <th>Specialization</th>
                    <th>Phone</th>
                    <th>Registration ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.id}>
                      <td>Dr. {doctor.name}</td>
                      <td>{doctor.email}</td>
                      <td>{doctor.specialization}</td>
                      <td>{doctor.phone}</td>
                      <td>{doctor.registration_id}</td>
                      <td>{getStatusBadge(doctor.status)}</td>
                      <td>
                        <div className="action-btns">
                          {doctor.status === 'Pending' && (
                            <>
                              <button
                                className="btn btn-sm btn-approve"
                                onClick={() => handleApprove(doctor.id)}
                                disabled={actionLoading === doctor.id}
                              >
                                <Check size={16} />
                                Approve
                              </button>
                              <button
                                className="btn btn-sm btn-reject"
                                onClick={() => handleReject(doctor.id)}
                                disabled={actionLoading === doctor.id}
                              >
                                <X size={16} />
                                Reject
                              </button>
                            </>
                          )}
                          {doctor.status === 'Approved' && (
                            <button
                              className="btn btn-sm btn-reject"
                              onClick={() => handleReject(doctor.id)}
                              disabled={actionLoading === doctor.id}
                            >
                              <X size={16} />
                              Reject
                            </button>
                          )}
                          {doctor.status === 'Rejected' && (
                            <button
                              className="btn btn-sm btn-approve"
                              onClick={() => handleApprove(doctor.id)}
                              disabled={actionLoading === doctor.id}
                            >
                              <Check size={16} />
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
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

export default ManageDoctors;
