const PatientGetStartedPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome to ClinicalIQ Patient</h1>
        <p className="text-slate-500 text-sm mt-1">
          View your lab reports, AI explanations, trends, and book appointments from one place.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-slate-500 text-sm font-semibold mb-1">Step 1</p>
          <h2 className="text-slate-900 font-bold mb-2">Report Analysis</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Open <strong>Report Analysis</strong> to upload or view your own lab reports.</li>
            <li>Use the AI analysis tab to see simple explanations of medical terms and test results.</li>
          </ul>
        </div>

        <div className="stat-card">
          <p className="text-slate-500 text-sm font-semibold mb-1">Step 2</p>
          <h2 className="text-slate-900 font-bold mb-2">Lab Reports & Trends</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Go to <strong>Lab Reports & Trend</strong> to see reports sent from the hospital using your register number.</li>
            <li>Use the trend graphs to track tests like Hemoglobin or Glucose over time.</li>
          </ul>
        </div>

        <div className="stat-card">
          <p className="text-slate-500 text-sm font-semibold mb-1">Step 3</p>
          <h2 className="text-slate-900 font-bold mb-2">AI Assistant & Appointments</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Open <strong>AI Assistant</strong> to ask health questions or get help understanding your reports.</li>
            <li>You can ask the assistant to <strong>book an appointment</strong>; the hospital admin will review and confirm it.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PatientGetStartedPage;

