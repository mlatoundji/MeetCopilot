/**
 * Handles interactions with the user interface, including updating the DOM
 * and managing button event listeners.
 */

const SYSTEM_SOURCE = 'system';
export class UIHandler {

    constructor() {
        this.isRecording = false;
      this.systemCaptureButton = document.getElementById("systemCaptureButton");
      this.micCaptureButton = document.getElementById("micCaptureButton");
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

      this.translations = {
        fr: {
          systemButtonStart: "Démarrer la capture système",
          systemButtonStop: "Arrêter la capture système",
          micButtonStart: "Démarrer la capture micro",
          micButtonStop: "Arrêter la capture micro",
          suggestionButton: "Générer des suggestions",
          addMeetingInfosButton: "Ajouter des infos de réunion",
          saveMeetingInfosButton: "Enregistrer les infos de réunion",
          closeMeetingInfosButton: "Fermer",
          transcriptionPlaceholder: "La transcription apparaîtra ici...",
          suggestionsPlaceholder: "Les suggestions apparaîtront ici.",
          meetingsInfosLabels : [
              "Titre du poste", 
              "Missions", 
              "Informations sur l'entreprise",
              "Informations sur le candidat (utilisateur)", 
              "Informations complémentaires"
            ]
        },
        en: {
          systemButtonStart: "Start System Capture",
          systemButtonStop: "Stop System Capture",
          micButtonStart: "Start Mic Capture",
          micButtonStop: "Stop Mic Capture",
          suggestionButton: "Generate Suggestions",
          addMeetingInfosButton: "Add Meeting Infos",
          saveMeetingInfosButton: "Save Meeting Infos",
          closeMeetingInfosButton: "Close",
          transcriptionPlaceholder: "Transcription will appear here...",
          suggestionsPlaceholder: "Suggestions will appear here.",
          meetingsInfosLabels : [
              "Job Title", 
              "Missions", 
              "Company Information",
              "Candidate Information (User)", 
              "Additional Information"
            ]
        },
      };

      this.selectedTranslations = this.translations[this.defaultLang];
    
      this.videoElement = document.getElementById("screen-capture");

    }

    translateUI(lang) {
        
        const uiElements = {
          suggestionButton: this.suggestionButton,
          addMeetingInfosButton: this.addMeetingInfosButton,
          saveMeetingInfosButton: this.saveMeetingInfosButton,
          closeMeetingInfosButton: this.closeMeetingInfosButton,
        };

        this.selectedTranslations = this.translations[lang];
            
        Object.keys(uiElements).forEach((key) => {
          if (uiElements[key]) {
            uiElements[key].textContent = this.selectedTranslations[key];
          }
        });
        this.systemCaptureButton.textContent = this.isRecording ? this.selectedTranslations.systemButtonStop : this.selectedTranslations.systemButtonStart;
        this.micCaptureButton.textContent = this.isRecording ? this.selectedTranslations.micButtonStop : this.selectedTranslations.micButtonStart;
        this.updateTranscription(this.selectedTranslations.transcriptionPlaceholder);
        this.updateSuggestions(this.selectedTranslations.suggestionsPlaceholder);
        this.meetingsInfosLabels = this.selectedTranslations.meetingsInfosLabels;
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
      this.translateUI(this.defaultLang);
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
        this.isRecording = isRecording;
        switch (type) {
        case SYSTEM_SOURCE:
            this.systemCaptureButton.textContent = this.isRecording ? this.selectedTranslations.systemButtonStop : this.selectedTranslations.systemButtonStart;
            break;
        default:
            this.micCaptureButton.textContent = this.isRecording ? this.selectedTranslations.micButtonStop : this.selectedTranslations.micButtonStart;
          break;
        }
    }

    populateVideoElement(stream) {
        this.videoElement.srcObject = stream;
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
        };
    }

    closeVideoElement() {
        this.videoElement.pause();
        this.videoElement.srcObject = null;
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
        this.systemCaptureButton.addEventListener("click", onSystemCapture);
        this.micCaptureButton.addEventListener("click", onMicCapture);
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
            this.micCaptureButton.click();
        } else if (event.code === "KeyC") {
            this.systemCaptureButton.click();
        }
        });
    }


  }
  