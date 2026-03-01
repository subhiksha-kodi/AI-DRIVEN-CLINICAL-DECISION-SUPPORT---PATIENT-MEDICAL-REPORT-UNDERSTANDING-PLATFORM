import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, MessageCircle, Send, Sparkles, Trash2, X } from 'lucide-react';
import patientApi from '../api/patientAxios';

function safeTryParseJson(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

const INITIAL_SUGGESTIONS = [
  'Explain my Hemoglobin result in simple words',
  'What does “reference range” mean in my lab report?',
  'My blood sugar is high. What could be the reasons?',
  'I want to book an appointment with a doctor tomorrow',
];

export default function PatientMedicalAssistant({ mode = 'floating' }) {
  const isPage = mode === 'page';
  const [open, setOpen] = useState(isPage);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      type: 'text',
      content:
        'Hi! I’m your Medical Assistant. Ask me about your lab reports, test values, or medical terms. I can also help with appointment requests.',
    },
  ]);

  const scrollRef = useRef(null);
  const [apptDraft, setApptDraft] = useState(null);
  const [apptSubmitting, setApptSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  const apiConversation = useMemo(() => {
    const turns = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));
    return turns;
  }, [messages]);

  const pushMessage = (m) => setMessages((prev) => [...prev, m]);

  const handleSend = async (text) => {
    const messageText = (text ?? input).trim();
    if (!messageText || sending) return;

    setInput('');
    pushMessage({ role: 'user', type: 'text', content: messageText });
    setSending(true);

    try {
      const { data } = await patientApi.post('/patient/chat', {
        message: messageText,
        conversation: apiConversation,
      });

      const reply = data?.data?.reply ?? '';
      const intentObj = safeTryParseJson(reply);

      if (intentObj?.intent && intentObj?.patient_message) {
        if (intentObj.intent === 'BOOK_APPOINTMENT') {
          setApptDraft({
            message: intentObj.patient_message,
            date: '',
            time: '',
            doctor: '',
            reason: '',
            phone: '',
          });
          pushMessage({
            role: 'assistant',
            type: 'text',
            content:
              'I can help you request an appointment. Please fill the date, time, doctor name, reason, and your phone number below.',
          });
        } else {
          pushMessage({
            role: 'assistant',
            type: 'intent',
            content: JSON.stringify(intentObj, null, 2),
            intent: intentObj.intent,
          });
        }
      } else {
        const isEmergency =
          typeof reply === 'string' && reply.includes('This may be a medical emergency');
        pushMessage({
          role: 'assistant',
          type: isEmergency ? 'emergency' : 'text',
          content: reply || 'Sorry, I could not generate a response. Please try again.',
        });
      }
    } catch (e) {
      pushMessage({
        role: 'assistant',
        type: 'error',
        content:
          e?.response?.data?.message || 'Assistant is unavailable right now. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        type: 'text',
        content:
          'Hi! I’m your Medical Assistant. Ask me about your lab reports, test values, or medical terms. I can also help with appointment requests.',
      },
    ]);
    setApptDraft(null);
  };

  const submitAppointment = async (e) => {
    e.preventDefault();
    if (!apptDraft || apptSubmitting) return;
    const { date, time, doctor, reason, phone, message } = apptDraft;
    if (!date || !time || !doctor || !reason || !phone) return;
    setApptSubmitting(true);
    try {
      await patientApi.post('/patient/appointments', {
        date,
        time,
        doctor,
        reason,
        phone,
        message,
      });
      pushMessage({
        role: 'assistant',
        type: 'text',
        content:
          'Your appointment request has been sent to the hospital. An admin will confirm the time, and you will receive an SMS on the provided phone number.',
      });
      setApptDraft(null);
    } catch (err) {
      pushMessage({
        role: 'assistant',
        type: 'error',
        content:
          err?.response?.data?.message || 'Could not send appointment request. Please try again.',
      });
    } finally {
      setApptSubmitting(false);
    }
  };

  const panelClass = isPage
    ? 'h-full rounded-2xl border border-slate-200 bg-white/85 shadow-md overflow-hidden'
    : 'absolute bottom-6 right-6 w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-24px)] rounded-2xl border border-slate-200 bg-white/85 backdrop-blur-xl shadow-2xl overflow-hidden';

  const panel = (
    <div className={panelClass}>
      <div className="p-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold leading-tight">AI Medical Assistant</p>
              <p className="text-xs text-white/85 leading-tight">
                Ask about lab reports. No diagnosis or prescriptions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearChat}
              className="p-2 rounded-xl hover:bg-white/15 transition"
              title="Clear chat"
            >
              <Trash2 size={16} />
            </button>
            {!isPage && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl hover:bg-white/15 transition"
                title="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="h-[calc(100%-152px)] overflow-y-auto p-4 space-y-3">
        {messages.length === 1 && (
          <div className="grid grid-cols-1 gap-2">
            {INITIAL_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                className="text-left rounded-2xl border border-slate-200 bg-white/70 hover:bg-sky-50/70 hover:border-sky-200 px-3 py-2 text-xs text-slate-700 transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          const base =
            'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm border';
          const userStyle =
            'ml-auto bg-gradient-to-r from-sky-600 to-indigo-600 text-white border-white/10';
          const assistantStyle = 'mr-auto bg-white/80 text-slate-800 border-slate-200';

          if (m.type === 'intent') {
            return (
              <div
                key={idx}
                className="mr-auto max-w-[90%] rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3"
              >
                <div className="flex items-center gap-2 text-indigo-800 text-xs font-semibold mb-2">
                  <CalendarClock size={14} />
                  Appointment request detected
                  <span className="ml-auto rounded-full bg-indigo-600/10 px-2 py-0.5 text-[11px] font-bold">
                    {m.intent}
                  </span>
                </div>
                <pre className="text-[11px] bg-white/70 border border-indigo-200 rounded-xl p-2 overflow-x-auto text-slate-700">
                  {m.content}
                </pre>
              </div>
            );
          }

          if (m.type === 'emergency') {
            return (
              <div
                key={idx}
                className="mr-auto max-w-[90%] rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-800"
              >
                <strong className="block mb-1">Emergency guidance</strong>
                {m.content}
              </div>
            );
          }

          if (m.type === 'error') {
            return (
              <div
                key={idx}
                className="mr-auto max-w-[90%] rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900"
              >
                {m.content}
              </div>
            );
          }

          return (
            <div key={idx} className={`${base} ${isUser ? userStyle : assistantStyle}`}>
              {m.content}
            </div>
          );
        })}

        {sending && (
          <div className="mr-auto max-w-[70%] rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
            Thinking…
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-200 bg-white/70 space-y-2">
        {apptDraft && (
          <form
            onSubmit={submitAppointment}
            className="mb-2 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 space-y-2 text-[11px] text-slate-800"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-indigo-900 text-xs flex items-center gap-1.5">
                <CalendarClock size={14} /> Appointment details
              </span>
              <button
                type="button"
                onClick={() => setApptDraft(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={apptDraft.date}
                onChange={(e) => setApptDraft((d) => ({ ...d, date: e.target.value }))}
                className="rounded-xl border border-slate-200 px-2 py-1"
                required
              />
              <input
                type="time"
                value={apptDraft.time}
                onChange={(e) => setApptDraft((d) => ({ ...d, time: e.target.value }))}
                className="rounded-xl border border-slate-200 px-2 py-1"
                required
              />
              <input
                type="text"
                placeholder="Doctor name"
                value={apptDraft.doctor}
                onChange={(e) => setApptDraft((d) => ({ ...d, doctor: e.target.value }))}
                className="rounded-xl border border-slate-200 px-2 py-1 col-span-2"
                required
              />
              <input
                type="tel"
                placeholder="Your phone number"
                value={apptDraft.phone}
                onChange={(e) => setApptDraft((d) => ({ ...d, phone: e.target.value }))}
                className="rounded-xl border border-slate-200 px-2 py-1 col-span-2"
                required
              />
              <textarea
                rows={2}
                placeholder="Reason for appointment"
                value={apptDraft.reason}
                onChange={(e) => setApptDraft((d) => ({ ...d, reason: e.target.value }))}
                className="rounded-xl border border-slate-200 px-2 py-1 col-span-2 resize-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={apptSubmitting}
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            >
              {apptSubmitting ? 'Sending…' : 'Send appointment request'}
            </button>
          </form>
        )}

        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a medical question…"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition"
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          For serious symptoms, consult a doctor. In emergencies, call local emergency services.
        </p>
      </div>
    </div>
  );

  if (isPage) {
    return <div className="h-full flex flex-col">{panel}</div>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[60] inline-flex items-center gap-2 rounded-full px-4 py-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 text-white shadow-xl shadow-indigo-600/25 hover:brightness-110 transition"
        aria-label="Open medical assistant"
      >
        <MessageCircle size={18} />
        <span className="text-sm font-semibold">Medical Assistant</span>
        <span className="ml-1 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
          Llama
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          {panel}
        </div>
      )}
    </>
  );
}

