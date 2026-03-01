const DoctorGetStartedPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome to ClinicalIQ Doctor</h1>
        <p className="text-slate-500 text-sm mt-1">
          This portal helps you review patient lab reports, AI analysis, and EHR summaries.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-slate-500 text-sm font-semibold mb-1">Step 1</p>
          <h2 className="text-slate-900 font-bold mb-2">Dashboard Overview</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Use <strong>Analyze Reports</strong> to open patient lab reports sent by the admin.</li>
            <li>Review AI extraction and clinical insights as a support tool, not a replacement for your judgement.</li>
          </ul>
        </div>

        <div className="stat-card">
          <p className="text-slate-500 text-sm font-semibold mb-1">Step 2</p>
          <h2 className="text-slate-900 font-bold mb-2">Use EHR Analysis</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Open <strong>EHR Analysis</strong> to see structured patient cohorts from Excel uploads.</li>
            <li>Filter by conditions, risk level, and lab trends to identify patients needing follow-up.</li>
          </ul>
        </div>

        <div className="stat-card">
          <p className="text-slate-500 text-sm font-semibold mb-1">Step 3</p>
          <h2 className="text-slate-900 font-bold mb-2">Keep Profile Updated</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Update your specialization and contact details under <strong>Profile</strong>.</li>
            <li>Admins may use this to route AI-assisted appointment requests to you.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DoctorGetStartedPage;

