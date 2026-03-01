import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Stethoscope, Users, FileText, Upload, Search,
  Trash2, Eye, CloudUpload, X, RefreshCw
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, bg }) => (
  <div className="stat-card flex items-center gap-4">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
      <Icon size={24} className={color} strokeWidth={2} />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <p className="text-slate-900 text-3xl font-bold mt-0.5">{value ?? '—'}</p>
    </div>
  </div>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────
const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [approvedDoctors, setApprovedDoctors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [uploadForm, setUploadForm] = useState({ patient_name: '', registration_number: '', assigned_doctor: '', report_type: 'lab' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data.data);
    } catch { toast.error('Failed to load stats'); }
  }, []);

  const fetchReports = useCallback(async (page = 1, q = '') => {
    setLoadingReports(true);
    try {
      const { data } = await api.get('/admin/reports', { params: { page, limit: 10, search: q } });
      setReports(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoadingReports(false); }
  }, []);

  const fetchApprovedDoctors = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/doctors/approved');
      setApprovedDoctors(data.data || []);
    } catch { console.log('Failed to load approved doctors'); }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchReports();
    fetchApprovedDoctors();
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchReports(1, search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleFile = (file) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv', 'application/csv'];
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file type. Allowed: pdf, jpg, png, docx, csv');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return toast.error('Please select a file');
    if (!uploadForm.patient_name) return toast.error('Patient name is required');
    if (!uploadForm.registration_number) return toast.error('Registration number is required');
    if (!uploadForm.assigned_doctor) return toast.error('Assigned doctor is required');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patient_name', uploadForm.patient_name);
    formData.append('registration_number', uploadForm.registration_number);
    formData.append('assigned_doctor', uploadForm.assigned_doctor);
    formData.append('report_type', uploadForm.report_type);

    setUploading(true);
    try {
      await api.post('/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Report uploaded successfully!');
      setSelectedFile(null);
      setUploadForm({ patient_name: '', registration_number: '', assigned_doctor: '', report_type: 'lab' });
      fetchStats();
      fetchReports(1, search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await api.delete(`/admin/report/${id}`);
      toast.success('Report deleted');
      fetchStats();
      fetchReports(pagination.page, search);
    } catch { toast.error('Failed to delete report'); }
  };

  const statCards = [
    { label: 'Total Doctors', value: stats?.totalDoctors, icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Patients', value: stats?.totalPatients, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Reports', value: stats?.totalReports, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Recent Uploads (7d)', value: stats?.recentUploads, icon: Upload, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Overview of the clinical platform</p>
        </div>
        <button onClick={() => { fetchStats(); fetchReports(pagination.page, search); }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="text-slate-800 font-semibold text-lg mb-5 flex items-center gap-2">
          <CloudUpload size={20} className="text-blue-600" />
          Upload Lab Report
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-slate-600 text-sm font-medium block mb-1">Patient Name *</label>
            <input className="input-field" placeholder="e.g. John Smith" value={uploadForm.patient_name}
              onChange={e => setUploadForm(p => ({ ...p, patient_name: e.target.value }))} />
          </div>
          <div>
            <label className="text-slate-600 text-sm font-medium block mb-1">Registration Number *</label>
            <input className="input-field" placeholder="e.g. REG-2024-001" value={uploadForm.registration_number}
              onChange={e => setUploadForm(p => ({ ...p, registration_number: e.target.value }))} />
          </div>
          <div>
            <label className="text-slate-600 text-sm font-medium block mb-1">Assigned Doctor *</label>
            <select className="input-field" value={uploadForm.assigned_doctor}
              onChange={e => setUploadForm(p => ({ ...p, assigned_doctor: e.target.value }))}>
              <option value="">Select a doctor</option>
              {approvedDoctors.map(doc => (
                <option key={doc.id} value={doc.name}>{doc.name} - {doc.specialization || 'General'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-600 text-sm font-medium block mb-1">Report Type *</label>
            <select className="input-field" value={uploadForm.report_type}
              onChange={e => setUploadForm(p => ({ ...p, report_type: e.target.value }))}>
              <option value="lab">Lab Report</option>
              <option value="prescription">Prescription</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
        >
          <input ref={fileInputRef} type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx,.csv"
            className="hidden"
            onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={28} className="text-blue-500" />
              <div className="text-left">
                <p className="text-slate-700 font-medium text-sm">{selectedFile.name}</p>
                <p className="text-slate-400 text-xs">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                className="ml-2 text-slate-400 hover:text-red-500">
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <CloudUpload size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium text-sm">Drop file here or click to browse</p>
              <p className="text-slate-400 text-xs mt-1">Supports: PDF, JPG, PNG, DOCX, CSV (max 20 MB)</p>
            </>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={handleUpload} disabled={uploading || !selectedFile}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
              : <><Upload size={15} /> Upload Report</>}
          </button>
        </div>
      </div>

      {/* Search + Reports Table */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-slate-800 font-semibold text-lg flex items-center gap-2">
            <FileText size={20} className="text-blue-600" /> Recent Reports
          </h2>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input className="input-field pl-9" placeholder="Search patient, reg no, doctor..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Reg. Number</th>
                <th>Doctor</th>
                <th>File Name</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingReports ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Loading reports...
                  </div>
                </td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">
                  No reports found {search && `for "${search}"`}
                </td></tr>
              ) : reports.map(r => (
                <tr key={r.id}>
                  <td className="font-medium text-slate-800">{r.patient_name}</td>
                  <td><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg">{r.registration_number}</span></td>
                  <td className="text-slate-600">{r.assigned_doctor}</td>
                  <td className="text-slate-500 max-w-[160px] truncate" title={r.file_name}>{r.file_name}</td>
                  <td className="text-slate-500 text-xs whitespace-nowrap">{new Date(r.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <a href={`${BACKEND_URL}/${r.file_path}`} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost flex items-center gap-1">
                        <Eye size={13} /> View
                      </a>
                      <button onClick={() => handleDelete(r.id)} className="btn-danger flex items-center gap-1">
                        <Trash2 size={13} /> Delete
                      </button>
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
                onClick={() => fetchReports(pagination.page - 1, search)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchReports(pagination.page + 1, search)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
