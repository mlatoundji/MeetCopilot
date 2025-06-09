export const meetingFieldsConfig = [
  {
    id: 'sessionInfo',
    title: 'Session Info',
    fields: [
      { key: 'session_title', label: 'Session Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: false },
      { key: 'host_name', label: 'Host Name', type: 'text', required: false },
    ]
  },
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