/**
 * Handles interactions with the user interface, including updating the DOM
 * and managing button event listeners.
 */

export class UIHandler {

    

    constructor() {
      this.captureButton = document.getElementById("captureButton");
      this.micButton = document.getElementById("micButton");
      this.suggestionButton = document.getElementById("suggestionButton");
      this.transcriptionDiv = document.getElementById("transcription");
      this.suggestionsDiv = document.getElementById("suggestions");
      
      this.addMeetingInfosButton = document.getElementById("addMeetingInfosButton");
      this.meetingModal = document.getElementById("meetingModal");
      this.modalOverlay = document.getElementById("modalOverlay");
      this.dynamicFields = document.getElementById("dynamicFields");
      this.saveMeetingInfosButton = document.getElementById("saveMeetingInfosButton");
      this.closeMeetingInfosButton = document.getElementById("closeMeetingInfosButton");
      this.meetingsInfosLabels = [
        "Titre du poste", 
        "Missions", 
        "Informations sur l'entreprise",
        "Informations sur le candidat (utilisateur)", 
        "Informations complémentaires"
      ];
      
      this.langSelect = document.getElementById("langSelect");
      this.defaultLang = "fr";
  
      this.supportedLangs = [
        { code: "fr", label: "Français" },
        { code: "en", label: "English" },
      ];
    }
  
    /**
     * Initializes the UI by populating language options and setting event listeners.
     * @param {Function} onLangChange - Callback for language change.
     */
    initialize(onLangChange) {
      this.populateLangOptions();
      this.langSelect.addEventListener("change", () => {
        const selectedLang = this.langSelect.value;
        onLangChange(selectedLang);
      });
    }
  
    /**
     * Populates the language selection dropdown.
     */
    populateLangOptions() {
      this.supportedLangs.forEach((lang) => {
        const option = document.createElement("option");
        option.value = lang.code;
        option.textContent = lang.label;
        this.langSelect.appendChild(option);
      });
      this.langSelect.value = this.defaultLang;
    }
  
    /**
     * Updates the transcription section of the UI.
     * @param {string} transcription - The transcription text to display.
     */
    updateTranscription(transcription) {
      this.transcriptionDiv.innerText = transcription;
    }
  
    /**
     * Updates the suggestions section of the UI.
     * @param {string} suggestions - The suggestions text to display.
     */
    updateSuggestions(suggestions) {
      this.suggestionsDiv.innerText = suggestions || "No suggestions generated.";
    }
  
    /**
     * Toggles the state of the capture buttons (system or mic).
     * @param {string} type - The type of capture ("system" or "mic").
     * @param {boolean} isRecording - Whether recording is active.
     */
    toggleCaptureButton(type, isRecording) {
      const button = type === "system" ? this.captureButton : this.micButton;
      button.textContent = isRecording ? `Stop ${type} Capture` : `Start ${type} Capture`;
    }

    populateMeetingModal(){
        dynamicFields.innerHTML = ""; 
        this.meetingsInfosLabels.forEach(key => {
          const label = document.createElement("label");
          label.innerText = key;
          const input = document.createElement("input");
          input.type = "text";
          input.id = `input-${key}`;
          input.style.display = "block";
          input.style.marginBottom = "10px";
          this.dynamicFields.appendChild(label);
          this.dynamicFields.appendChild(input);
        });
        this.meetingModal.style.display = "block";
        this.modalOverlay.style.display = "block";
    }

    closeMeetingModal(){
        this.meetingModal.style.display = "none";
        this.modalOverlay.style.display = "none";
    }
  
    attachCaptureEventListeners(onSystemCapture, onMicCapture) {
        this.captureButton.addEventListener("click", onSystemCapture);
        this.micButton.addEventListener("click", onMicCapture);
    }
    attachSuggestionEventListeners(onGenerateSuggestions) {;
        this.suggestionButton.addEventListener("click", onGenerateSuggestions);
    }
    attachMeetingInfosEventListeners(onAddMeetingInfos, onCloseMeetingInfos, onSaveMeetingInfos) {    
        this.addMeetingInfosButton.addEventListener("click", onAddMeetingInfos);
        this.closeMeetingInfosButton.addEventListener("click", onCloseMeetingInfos);
        this.saveMeetingInfosButton.addEventListener("click", onSaveMeetingInfos);
    }
    initializeKeydownEventListeners() {        
        document.addEventListener("keydown", (event) => {
        if (event.code === "Space" && meetingModal.style.display === "none") {
            this.suggestionButton.click();
        } else if (event.code === "KeyM") {
            this.micButton.click();
        } else if (event.code === "KeyC") {
            this.captureButton.click();
        }
        });
    }


  }
  