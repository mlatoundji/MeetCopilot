export const meetingFieldsConfig = [
  {
    id: 'sessionInfo',
    title: 'Informations de session',
    fields: [
      { key: 'session_title', label: 'Titre de la session', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: false },
      { key: 'host_name', label: "Nom de l'hôte", type: 'text', required: false },
    ]
  },
  {
    id: 'meeting',
    title: 'Détails de la réunion',
    fields: [
      { key: 'jobTitle', label: 'Titre du poste', type: 'text', required: false },
      { key: 'missions', label: 'Missions', type: 'text', required: false },
      { key: 'companyInfo', label: "Informations sur l'entreprise", type: 'textarea', required: false },
      { key: 'candidateInfo', label: "Informations sur le candidat", type: 'textarea', required: false },
      { key: 'additionalInfo', label: "Informations complémentaires", type: 'textarea', required: false }
    ]
  }
]; 