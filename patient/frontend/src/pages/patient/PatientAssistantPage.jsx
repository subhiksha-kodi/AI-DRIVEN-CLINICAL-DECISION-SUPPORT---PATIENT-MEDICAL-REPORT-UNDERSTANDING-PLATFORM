import PatientMedicalAssistant from '../../components/PatientMedicalAssistant';

const PatientAssistantPage = () => {
  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">AI Medical Assistant</h1>
        <p className="text-slate-500 text-sm mt-1">
          Ask health-related questions and get explanations about your lab reports. No diagnosis or prescriptions.
        </p>
      </div>

      <div className="flex-1 min-h-[460px]">
        <PatientMedicalAssistant mode="page" />
      </div>
    </div>
  );
};

export default PatientAssistantPage;

