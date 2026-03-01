import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet, Upload, Search, Plus, Trash2, Save,
  RefreshCw, X, Download, Edit3, Check, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

// ─── Editable Cell Component ─────────────────────────────────────────────────
const EditableCell = ({ value, onChange, type = 'text', isEditing, onStartEdit, onSave }) => {
  const [localValue, setLocalValue] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSave(localValue);
    } else if (e.key === 'Escape') {
      setLocalValue(value ?? '');
      onSave(value);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => onSave(localValue)}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    );
  }

  return (
    <div
      onClick={onStartEdit}
      className="px-2 py-1 text-sm cursor-pointer hover:bg-slate-100 rounded min-h-[28px] truncate"
      title={String(value ?? '')}
    >
      {value ?? '—'}
    </div>
  );
};

// ─── Admin EHR Page ───────────────────────────────────────────────────────────
const AdminEhrPage = () => {
  const [patients, setPatients] = useState([]);
  const [columns, setColumns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 500, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowId, colKey }
  const [modifiedRows, setModifiedRows] = useState(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [customColumns, setCustomColumns] = useState([]);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [hasData, setHasData] = useState(false); // Track if data has been uploaded
  const fileInputRef = useRef();

  // Default visible columns (can be customized)
  const defaultVisibleColumns = [
    'patient_id', 'age', 'gender', 'city', 'state', 'chronic_conditions',
    'total_medications', 'emergency_visits', 'wellness_visits'
  ];
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);

  // Fetch columns definition
  const fetchColumns = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/ehr/columns');
      setColumns(data.data);
    } catch {
      toast.error('Failed to load column definitions');
    }
  }, []);

  // Fetch patients
  const fetchPatients = useCallback(async (page = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ehr/patients', {
        params: { page, limit: 500, search: q }
      });
      setPatients(data.data.patients);
      setPagination(data.data.pagination);
      // Mark that data has been uploaded if we have records
      if (data.data.pagination.total > 0) {
        setHasData(true);
      }
    } catch {
      toast.error('Failed to load EHR data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColumns();
    fetchPatients();
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchPatients(1, search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Handle file upload
  const handleFile = async (file) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      toast.error('Please upload an Excel file (.xlsx, .xls) or CSV');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const { data } = await api.post('/admin/ehr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(data.message);
      fetchPatients(1, search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Handle cell edit
  const handleCellChange = (patientId, columnKey, newValue) => {
    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        return { ...p, [columnKey]: newValue };
      }
      return p;
    }));
    setModifiedRows(prev => new Set(prev).add(patientId));
    setEditingCell(null);
  };

  // Save all changes
  const handleSaveAll = async () => {
    if (modifiedRows.size === 0) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const modifiedPatients = patients.filter(p => modifiedRows.has(p.id));
      await api.put('/admin/ehr/bulk-update', { patients: modifiedPatients });
      toast.success(`Saved ${modifiedRows.size} records`);
      setModifiedRows(new Set());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Add new row
  const handleAddRow = async () => {
    const newPatientId = `NEW_${Date.now()}`;
    const newPatient = {
      id: null,
      patient_id: newPatientId,
      age: null,
      gender: '',
      race: '',
      ethnicity: '',
      marital_status: '',
      income: null,
      city: '',
      state: '',
      zip: '',
      healthcare_expenses: null,
      healthcare_coverage: null,
      total_encounters: 0,
      emergency_visits: 0,
      inpatient_visits: 0,
      outpatient_visits: 0,
      wellness_visits: 0,
      ambulatory_visits: 0,
      total_conditions: 0,
      chronic_conditions: 0,
      total_medications: 0,
      unique_medications: 0,
      total_dispenses: 0,
      total_procedures: 0,
      total_allergies: 0,
      total_observations: 0,
      total_imaging_studies: 0,
      total_immunizations: 0,
      total_careplans: 0,
      total_supplies: 0,
      total_devices: 0,
      isNew: true
    };
    setPatients(prev => [newPatient, ...prev]);
    setEditingCell({ rowId: null, colKey: 'patient_id', isNew: true, tempId: newPatientId });
  };

  // Save new row
  const handleSaveNewRow = async (patient) => {
    if (!patient.patient_id || patient.patient_id.startsWith('NEW_')) {
      toast.error('Please enter a valid Patient ID');
      return;
    }

    try {
      const { isNew, ...patientData } = patient;
      const { data } = await api.post('/admin/ehr/patient', patientData);
      toast.success('Patient added successfully');
      fetchPatients(1, search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add patient');
    }
  };

  // Delete patient
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient record?')) return;

    try {
      await api.delete(`/admin/ehr/patient/${id}`);
      toast.success('Patient deleted');
      fetchPatients(pagination.page, search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Add custom column (UI only - for display purposes)
  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    const columnKey = newColumnName.toLowerCase().replace(/\s+/g, '_');
    if (columns.find(c => c.key === columnKey) || customColumns.find(c => c.key === columnKey)) {
      toast.error('Column already exists');
      return;
    }
    setCustomColumns(prev => [...prev, { key: columnKey, label: newColumnName, type: 'string' }]);
    setVisibleColumns(prev => [...prev, columnKey]);
    setNewColumnName('');
    setShowAddColumn(false);
    toast.success('Column added');
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(k => k !== columnKey);
      }
      return [...prev, columnKey];
    });
  };

  const allColumns = [...columns, ...customColumns];
  const displayColumns = allColumns.filter(c => visibleColumns.includes(c.key));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" size={28} />
            EHR Analysis
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Upload, view, and edit patient health records</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchPatients(pagination.page, search); }}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {modifiedRows.size > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : `Save Changes (${modifiedRows.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload Excel File</h2>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload size={48} className="mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600 mb-2">Drag and drop your Excel file here, or</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Browse Files'}
          </button>
          <p className="text-slate-400 text-sm mt-3">Supported formats: .xlsx, .xls, .csv</p>
        </div>
      </div>

      {/* Data Table Section - Only show after data exists */}
      {hasData && (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* Table Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <span className="text-sm text-slate-500">
              {pagination.total} patients found
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm"
            >
              <Plus size={16} /> Add Row
            </button>
            <div className="relative">
              <button
                onClick={() => setShowAddColumn(!showAddColumn)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm"
              >
                <Plus size={16} /> Add Column
              </button>
              {showAddColumn && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-10 w-64">
                  <input
                    type="text"
                    placeholder="Column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddColumn}
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setShowAddColumn(false); setNewColumnName(''); }}
                      className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column Visibility Toggle */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 mr-2">Columns:</span>
            {allColumns.slice(0, 15).map(col => (
              <button
                key={col.key}
                onClick={() => toggleColumnVisibility(col.key)}
                className={`px-2 py-1 text-xs rounded-full transition ${
                  visibleColumns.includes(col.key)
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {col.label}
              </button>
            ))}
            {allColumns.length > 15 && (
              <span className="text-xs text-slate-400">+{allColumns.length - 15} more</span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <FileSpreadsheet size={48} className="mx-auto mb-4 text-slate-300" />
              <p>No patient records found. Upload an Excel file to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">
                    Actions
                  </th>
                  {displayColumns.map(col => (
                    <th
                      key={col.key}
                      className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((patient, rowIndex) => (
                  <tr
                    key={patient.id || patient.patient_id}
                    className={`hover:bg-slate-50 ${
                      modifiedRows.has(patient.id) ? 'bg-amber-50' : ''
                    } ${patient.isNew ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-3 py-2 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-1">
                        {patient.isNew ? (
                          <button
                            onClick={() => handleSaveNewRow(patient)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save new patient"
                          >
                            <Check size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(patient.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {modifiedRows.has(patient.id) && (
                          <span className="w-2 h-2 bg-amber-500 rounded-full" title="Modified" />
                        )}
                      </div>
                    </td>
                    {displayColumns.map(col => (
                      <td key={col.key} className="px-1 py-1 whitespace-nowrap max-w-[150px]">
                        <EditableCell
                          value={patient[col.key]}
                          type={col.type}
                          isEditing={
                            editingCell?.rowId === patient.id && editingCell?.colKey === col.key ||
                            (patient.isNew && editingCell?.tempId === patient.patient_id && editingCell?.colKey === col.key)
                          }
                          onStartEdit={() => setEditingCell({
                            rowId: patient.id,
                            colKey: col.key,
                            isNew: patient.isNew,
                            tempId: patient.patient_id
                          })}
                          onSave={(newValue) => {
                            if (patient.isNew) {
                              setPatients(prev => prev.map(p => {
                                if (p.patient_id === patient.patient_id && p.isNew) {
                                  return { ...p, [col.key]: newValue };
                                }
                                return p;
                              }));
                            } else {
                              handleCellChange(patient.id, col.key, newValue);
                            }
                            setEditingCell(null);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchPatients(pagination.page - 1, search)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => fetchPatients(pagination.page + 1, search)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default AdminEhrPage;
