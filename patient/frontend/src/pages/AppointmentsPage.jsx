import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, Phone, RefreshCw, User, XCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/appointments');
      setAppointments(data.data || []);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const updateAppointment = async (id, status, doctor_name) => {
    setUpdatingId(id);
    try {
      const { data } = await api.put(`/admin/appointments/${id}`, {
        status,
        doctor_name,
      });
      const updated = data.data;
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast.success('Appointment updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update appointment');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review and approve appointment requests coming from the patient portal AI assistant.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAppointments}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            Loading appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <CalendarClock size={40} className="text-slate-300 mb-3" />
            <p className="font-medium">No appointment requests yet</p>
            <p className="text-sm mt-1 text-center max-w-sm">
              When patients ask the AI assistant to book an appointment, requests will appear here for your
              review and approval.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => {
              const statusColor = STATUS_COLORS[a.status] || STATUS_COLORS.pending;
              return (
                <div
                  key={a.id}
                  className="border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <User size={14} className="text-blue-600" />
                        {a.patient_name}
                      </span>
                      {a.registration_number && (
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                          Reg: {a.registration_number}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}
                      >
                        {a.status === 'pending' && <Clock size={12} />}
                        {a.status === 'confirmed' && <CheckCircle2 size={12} />}
                        {a.status === 'cancelled' && <XCircle size={12} />}
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={12} className="text-blue-500" />
                        {a.date} • {a.time}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} className="text-emerald-500" />
                        {a.phone}
                      </span>
                      {a.doctor_name && (
                        <span className="inline-flex items-center gap-1">
                          <User size={12} className="text-purple-500" />
                          {a.doctor_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Reason:</span> {a.reason}
                    </p>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 w-full md:w-60">
                    <input
                      type="text"
                      placeholder="Assign / change doctor name"
                      defaultValue={a.doctor_name || ''}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && value !== a.doctor_name) {
                          updateAppointment(a.id, a.status, value);
                        }
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={updatingId === a.id || a.status === 'confirmed'}
                        onClick={() => updateAppointment(a.id, 'confirmed', a.doctor_name)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
                      >
                        <CheckCircle2 size={12} />
                        Confirm
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === a.id || a.status === 'cancelled'}
                        onClick={() => updateAppointment(a.id, 'cancelled', a.doctor_name)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
                      >
                        <XCircle size={12} />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsPage;

