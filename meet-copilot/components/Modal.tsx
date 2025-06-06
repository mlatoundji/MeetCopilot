import React from 'react';

export const ModalOverlay: React.FC = () => (
  <div id="modalOverlay" className="modal-overlay" style={{ display: 'none' }} />
);

export const MeetingModal: React.FC = () => (
  <div
    id="meetingModal"
    className="meeting-modal"
    style={{ display: 'none' }}
    role="dialog"
    aria-labelledby="modalTitle"
    aria-modal="true"
    tabIndex={-1}
  >
    <h2 id="modalTitle">Add Meeting Infos</h2>
    <div id="dynamicFields" />
    <div className="modal-nav">
      <button id="saveMeetingInfosButton" className="button-primary">Validate</button>
      <button id="startSessionButton" className="button-primary" style={{ display: 'none' }}>
        Start
      </button>
      <button id="closeMeetingInfosButton" className="button-secondary">Close</button>
    </div>
  </div>
); 