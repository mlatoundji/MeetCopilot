export const meetingFieldsConfig = [
  // Example category for contextual information fields
  {
    id: 'meeting',
    title: 'Meeting Details',
    fields: [
      { key: 'jobTitle', label: 'Job Title', type: 'text', required: false },
      { key: 'missions', label: 'Missions', type: 'text', required: false },
      { key: 'companyInfo', label: "Company Information", type: 'textarea', required: false },
      { key: 'candidateInfo', label: "Candidate Information", type: 'textarea', required: false },
      { key: 'additionalInfo', label: "Additional Information", type: 'textarea', required: false }
    ]
  }
]; 