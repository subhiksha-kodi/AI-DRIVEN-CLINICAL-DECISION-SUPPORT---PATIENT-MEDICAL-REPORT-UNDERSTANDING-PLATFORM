const AdminGetStartedPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome to ClinicalIQ Admin</h1>
        <p className="text-slate-500 text-sm mt-1">
          Use this portal to manage doctors, patients, and lab reports uploaded from the hospital.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-slate-500 text-sm font-semibold mb-1">Step 1</p>
          <h2 className="text-slate-900 font-bold mb-2">Add & Approve Doctors</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Go to <strong>Manage Doctors</strong> to approve new doctor accounts.</li>
            <li>Only approved doctors can log in to the Doctor Portal.</li>
          </ul>
        </div>

        <div className="stat-card">
          <p className="text-slate-500 text-sm font-semibold mb-1">Step 2</p>
          <h2 className="text-slate-900 font-bold mb-2">Upload Lab Reports</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Use the dashboard upload section to attach PDF or image reports.</li>
            <li>Enter <strong>patient name</strong>, <strong>register number</strong>, and <strong>assigned doctor</strong>.</li>
          </ul>
        </div>

        <div className="stat-card">
          <p className="text-slate-500 text-sm font-semibold mb-1">Step 3</p>
          <h2 className="text-slate-900 font-bold mb-2">Review AI Appointments</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Open the <strong>Appointments</strong> tab to see patient requests from the AI assistant.</li>
            <li>Assign the appropriate doctor and confirm or cancel the appointment.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminGetStartedPage;

