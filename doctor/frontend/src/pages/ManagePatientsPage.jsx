import { useState, useEffect, useCallback } from 'react';
import { Users, Search, FileText, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ManagePatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPatients = useCallback(async (page = 1, s = '', d = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/patients', {
        params: { page, limit: 10, search: s, doctor: d },
      });
      setPatients(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPatients(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchPatients(1, search, doctorSearch), 400);
    return () => clearTimeout(t);
  }, [search, doctorSearch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Patients</h1>
          <p className="text-slate-500 text-sm mt-0.5">View all patients derived from uploaded lab reports</p>
        </div>
        <button onClick={() => fetchPatients(pagination.page, search, doctorSearch)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <p className="text-blue-100 text-sm">Total Unique Patients</p>
            <p className="text-4xl font-bold">{pagination.total}</p>
          </div>
        </div>
        <FileText size={60} className="text-blue-500/40" />
      </div>

      {/* Search + Table */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-5">
          <h2 className="text-slate-800 font-semibold text-lg flex-shrink-0 flex items-center gap-2 self-center">
            <Users size={20} className="text-blue-600" /> Patient Records
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 ml-auto w-full sm:w-auto">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input className="input-field pl-9 w-full sm:w-56" placeholder="Search name or reg. no..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input className="input-field pl-9 w-full sm:w-48" placeholder="Filter by doctor..."
                value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient Name</th>
                <th>Registration Number</th>
                <th>Assigned Doctor</th>
                <th className="text-center">Total Reports</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Loading patients...
                  </div>
                </td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">
                  No patients found {search && `for "${search}"`}
                </td></tr>
              ) : patients.map((p, idx) => (
                <tr key={p.registration_number}>
                  <td className="text-slate-400 text-xs">{((pagination.page - 1) * pagination.limit) + idx + 1}</td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xs font-bold uppercase">
                          {p.patient_name?.charAt(0) || 'P'}
                        </span>
                      </div>
                      <span className="font-medium text-slate-800">{p.patient_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-600">
                      {p.registration_number}
                    </span>
                  </td>
                  <td className="text-slate-600">{p.assigned_doctor}</td>
                  <td className="text-center">
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                      <FileText size={11} /> {p.total_reports}
                    </span>
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
                onClick={() => fetchPatients(pagination.page - 1, search, doctorSearch)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPatients(pagination.page + 1, search, doctorSearch)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagePatientsPage;
