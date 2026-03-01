import { useState, useEffect, useCallback } from 'react';
import { UserRound, Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const map = {
    pending: 'badge badge-pending',
    approved: 'badge badge-approved',
    rejected: 'badge badge-rejected',
  };
  return (
    <span className={map[status] || 'badge bg-slate-100 text-slate-500'}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'approved' ? 'bg-emerald-500' : status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
        }`} />
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

const ManageDoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDoctors = useCallback(async (page = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/doctors', { params: { page, limit: 10, search: q } });
      setDoctors(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load doctors'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDoctors(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchDoctors(1, search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleAction = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    try {
      await api.put(`/admin/doctor/${id}/${action}`);
      toast.success(`Doctor ${action}d successfully`);
      fetchDoctors(pagination.page, search);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} doctor`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Doctors</h1>
          <p className="text-slate-500 text-sm mt-0.5">Review and approve doctor registrations</p>
        </div>
        <button onClick={() => fetchDoctors(pagination.page, search)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Count summary */}
      <div className="grid grid-cols-3 gap-4">
        {['pending', 'approved', 'rejected'].map(s => {
          const count = doctors.filter(d => d.approval_status === s).length;
          const colors = {
            pending: 'bg-amber-50 border-amber-200 text-amber-700',
            approved: 'bg-emerald-50 border-emerald-200 text-emerald-700',
            rejected: 'bg-red-50 border-red-200 text-red-700',
          };
          return (
            <div key={s} className={`rounded-xl border px-5 py-4 flex items-center justify-between ${colors[s]}`}>
              <span className="text-sm font-semibold capitalize">{s}</span>
              <span className="text-2xl font-bold">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Search + Table */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-slate-800 font-semibold text-lg flex items-center gap-2">
            <UserRound size={20} className="text-blue-600" /> All Doctors
            <span className="text-slate-400 font-normal text-sm">({pagination.total})</span>
          </h2>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input className="input-field pl-9" placeholder="Search name or email..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>License ID</th>
                <th>Specialization</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Loading doctors...
                  </div>
                </td></tr>
              ) : doctors.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">No doctors found</td></tr>
              ) : doctors.map((doc, idx) => (
                <tr key={doc.id}>
                  <td className="text-slate-400 text-xs">{((pagination.page - 1) * pagination.limit) + idx + 1}</td>
                  <td className="font-medium text-slate-800">{doc.name}</td>
                  <td className="text-slate-500 text-xs">{doc.email}</td>
                  <td>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                      {doc.medical_license_id || '—'}
                    </span>
                  </td>
                  <td className="text-slate-600">{doc.specialization || '—'}</td>
                  <td className="text-slate-500 text-xs">{doc.phone || '—'}</td>
                  <td><StatusBadge status={doc.approval_status} /></td>
                  <td className="text-slate-400 text-xs whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {doc.approval_status !== 'approved' && (
                        <button
                          onClick={() => handleAction(doc.id, 'approve')}
                          disabled={actionLoading === `${doc.id}-approve`}
                          className="btn-success flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === `${doc.id}-approve`
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <CheckCircle size={12} />}
                          Approve
                        </button>
                      )}
                      {doc.approval_status !== 'rejected' && (
                        <button
                          onClick={() => handleAction(doc.id, 'reject')}
                          disabled={actionLoading === `${doc.id}-reject`}
                          className="btn-danger flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === `${doc.id}-reject`
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <XCircle size={12} />}
                          Reject
                        </button>
                      )}
                      {doc.approval_status === 'approved' && (
                        <span className="text-emerald-600 text-xs font-medium">✓ Active</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1}
                onClick={() => fetchDoctors(pagination.page - 1, search)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchDoctors(pagination.page + 1, search)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageDoctorsPage;
