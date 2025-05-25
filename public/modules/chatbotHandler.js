/**
 * Gestionnaire du chatbot
 * @param {Object} apiHandler - L'instance de l'APIHandler
 */
export class ChatbotHandler {
  constructor(apiHandler) {
    this.apiHandler = apiHandler;
    this.previewContainer = null;
    this.toggleBtn = null;
    this.drawer = null;
    this.input = null;
    this.sendBtn = null;
    this.messagesContainer = null;
    this.attachBtn = null;
    this.cameraBtn = null;
    this.fileInput = null;
    this.cameraInput = null;
    this.attachments = [];
    // Session ID for persisting chat history
    this.sessionId = localStorage.getItem('chatbotSessionId') || ('_' + Math.random().toString(36).substr(2, 9));
    localStorage.setItem('chatbotSessionId', this.sessionId);
    // Context snippet and model selector
    this.contextSnippet = '';
    this.modelSelect = null;
  }

  init() {
    this.toggleBtn = document.getElementById('chatbotToggle');
    this.drawer = document.getElementById('chatbotDrawer');
    this.input = document.getElementById('chatbotInput');
    this.sendBtn = document.getElementById('chatbotSend');
    this.messagesContainer = document.getElementById('chatbotMessages');
    this.previewContainer = document.getElementById('chatbotPreview');
    this.attachBtn = document.getElementById('chatbotAttach');
    this.cameraBtn = document.getElementById('chatbotCamera');
    this.fileInput = document.getElementById('chatbotFileInput');
    this.cameraInput = document.getElementById('chatbotCameraInput');
    const contextBtn = document.getElementById('chatbotContext');
    this.modelSelect = document.getElementById('chatbotModelSelect');

    if (!this.toggleBtn || !this.drawer) return;

    this.toggleBtn.addEventListener('click', () => this.openDrawer());
    const closeBtn = document.getElementById('chatbotClose');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeDrawer());

    if (this.attachBtn && this.fileInput) {
      this.attachBtn.addEventListener('click', () => this.fileInput.click());
      this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
    }
    if (this.cameraBtn && this.cameraInput) {
      this.cameraBtn.addEventListener('click', () => this.cameraInput.click());
      this.cameraInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
    }
    if (contextBtn) {
      contextBtn.addEventListener('click', () => {
        const sel = window.getSelection().toString().trim();
        if (sel) {
          this.contextSnippet = sel;
          this.input.placeholder = `Context attached: ${sel.slice(0,20)}...`;
        }
      });
    }
    // Load existing chat history
    this.fetchHistory();

    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Draggable drawer via header
    const header = this.drawer.querySelector('.chatbot-header');
    if (header) {
      header.addEventListener('mousedown', (e) => {
        // Only start drag when clicking on header background, not on buttons, inputs, selects
        if (e.target.closest('button, input, select')) return;
        this.startDrag(e);
      });
    }

    // Settings panel toggle and inputs
    this.settingsBtn = document.getElementById('chatbotSettings');
    this.settingsPanel = document.getElementById('chatbotSettingsPanel');
    const opacityInput = document.getElementById('settingsOpacity');
    const widthInput = document.getElementById('settingsWidth');
    const heightInput = document.getElementById('settingsHeight');
    if (this.settingsBtn && this.settingsPanel) {
      this.settingsBtn.addEventListener('click', () => this.settingsPanel.classList.toggle('open'));
    }
    if (opacityInput) {
      opacityInput.addEventListener('input', (e) => {
        const v = e.target.value;
        document.documentElement.style.setProperty('--chatbot-opacity', v / 100);
      });
    }
    if (widthInput) {
      widthInput.addEventListener('input', (e) => {
        this.drawer.style.width = e.target.value + 'px';
      });
    }
    if (heightInput) {
      heightInput.addEventListener('input', (e) => {
        this.drawer.style.height = e.target.value + 'px';
      });
    }
  }

  /**
   * Fetch and render chat history
   */
  async fetchHistory() {
    try {
      const resp = await this.apiHandler.getChatbotHistory(this.sessionId);
      if (resp && resp.messages) {
        resp.messages.forEach(msg => {
          const msgEl = document.createElement('div');
          msgEl.className = 'chatbot-message ' + (msg.role === 'user' ? 'user' : 'bot');
          msgEl.innerText = msg.content;
          this.messagesContainer.appendChild(msgEl);
        });
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    } catch (err) {
      console.error('Failed to load chat history', err);
    }
  }

  openDrawer() {
    this.drawer.classList.add('open');
  }

  closeDrawer() {
    this.drawer.classList.remove('open');
  }

  /**
   * Handle file attachments from input or camera
   * @param {FileList} files
   */
  handleFiles(files) {
    this.attachments = Array.from(files);
    this.renderPreview();
  }

  /** Render the attachments preview area with remove buttons */
  renderPreview() {
    if (!this.previewContainer) return;
    this.previewContainer.innerHTML = '';
    this.attachments.forEach((file, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chatbot-preview-item';
      let previewEl;
      if (file.type.startsWith('image/')) {
        previewEl = document.createElement('img');
        const url = URL.createObjectURL(file);
        previewEl.src = url;
        previewEl.className = 'chatbot-preview-image';
        previewEl.onload = () => URL.revokeObjectURL(url);
      } else {
        previewEl = document.createElement('div');
        previewEl.className = 'chatbot-attachment-name';
        previewEl.innerText = file.name;
      }
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'chatbot-preview-remove-btn';
      removeBtn.innerText = '✕';
      removeBtn.addEventListener('click', () => this.removeAttachment(idx));
      wrapper.appendChild(previewEl);
      wrapper.appendChild(removeBtn);
      this.previewContainer.appendChild(wrapper);
    });
  }

  /** Remove an attachment by index and re-render preview */
  removeAttachment(idx) {
    this.attachments.splice(idx, 1);
    this.renderPreview();
  }

  async sendMessage() {
    const question = this.input.value.trim();
    if (!question && this.attachments.length === 0) return;

    // Append user message
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'chatbot-message user';
    userMsgEl.innerText = question;
    this.messagesContainer.appendChild(userMsgEl);
    // Display thumbnails inline with the user's message
    const attachmentsToSend = this.attachments.slice();
    this.attachments = [];
    attachmentsToSend.forEach(file => {
      let thumb;
      if (file.type.startsWith('image/')) {
        thumb = document.createElement('img');
        const url = URL.createObjectURL(file);
        thumb.src = url;
        thumb.className = 'chatbot-attachment-image';
        thumb.onload = () => URL.revokeObjectURL(url);
      } else {
        thumb = document.createElement('div');
        thumb.className = 'chatbot-attachment-name';
        thumb.innerText = file.name;
      }
      this.messagesContainer.appendChild(thumb);
    });
    // Clear preview area
    if (this.previewContainer) this.previewContainer.innerHTML = '';

    // Persist user message only if non-empty
    if (question) this.apiHandler.saveChatbotHistory(this.sessionId, 'user', question).catch(err => console.error('Save history error', err));

    // Clear input and reset attachments
    this.input.value = '';
    this.input.placeholder = 'Ask your question...';
    if (this.fileInput) this.fileInput.value = '';
    if (this.cameraInput) this.cameraInput.value = '';
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Show typing indicator and prepare bot message container
    const botMsgEl = document.createElement('div');
    botMsgEl.className = 'chatbot-message bot';
    this.messagesContainer.appendChild(botMsgEl);
    const typingEl = document.createElement('div');
    typingEl.className = 'chatbot-message bot typing';
    typingEl.innerText = 'Typing...';
    this.messagesContainer.appendChild(typingEl);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Determine chosen model
    const model = this.modelSelect ? this.modelSelect.value : undefined;

    // If there are attachments, send via FormData and await JSON response
    if (attachmentsToSend.length > 0) {
      try {
        const data = await this.apiHandler.sendChatbotMessage(question, attachmentsToSend, model, this.contextSnippet, this.sessionId);
        // Render uploaded attachments
        data.uploaded.forEach(url => {
          let el;
          if (/\.(png|jpe?g|gif|webp)$/i.test(url)) {
            el = document.createElement('img');
            el.src = url;
            el.className = 'chatbot-attachment-image';
          } else {
            el = document.createElement('a');
            el.href = url;
            el.target = '_blank';
            el.innerText = url.split('/').pop();
            el.className = 'chatbot-attachment-link';
          }
          this.messagesContainer.appendChild(el);
        });
        typingEl.remove();
        botMsgEl.innerText = data.response || 'No response';
        // Persist assistant message
        await this.apiHandler.saveChatbotHistory(this.sessionId, 'assistant', botMsgEl.innerText).catch(err => console.error('Save history error', err));
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      } catch (err) {
        console.error('Chatbot request failed', err);
        typingEl.remove();
      }
      // attachments remain for follow-up unless user clears
      return;
    } else {
      // Stream response via SSE as raw text
      const streamUrl = `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/chatbot/message/stream?sessionId=${encodeURIComponent(this.sessionId)}&question=${encodeURIComponent(question)}${model ? `&model=${encodeURIComponent(model)}` : ''}${this.contextSnippet ? `&contextSnippet=${encodeURIComponent(this.contextSnippet)}` : ''}`;
      const es = new EventSource(streamUrl);
      es.onmessage = (e) => {
        if (e.data === '[DONE]') {
          typingEl.remove();
          es.close();
          // Persist full assistant message
          this.apiHandler.saveChatbotHistory(this.sessionId, 'assistant', botMsgEl.innerText.trim()).catch(err => console.error('Save history error', err));
          return;
        }
        // Append raw text chunk
        botMsgEl.innerText += e.data + ' ';
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      };
      es.onerror = (err) => {
        typingEl.remove();
        botMsgEl.innerText = 'Error';
        es.close();
        console.error('Chatbot stream error', err);
      };
    }
  }

  /** Start dragging the chatbot drawer */
  startDrag(e) {
    e.preventDefault();
    const rect = this.drawer.getBoundingClientRect();
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;
    // Fix position
    this.drawer.style.left = rect.left + 'px';
    this.drawer.style.top = rect.top + 'px';
    this.drawer.style.right = 'auto';
    this.drawer.style.bottom = 'auto';
    this.drawer.style.transform = 'none';
    // Bind move/end
    this._onDragMove = this.onDrag.bind(this);
    this._onDragEnd = this.onDragEnd.bind(this);
    document.addEventListener('mousemove', this._onDragMove);
    document.addEventListener('mouseup', this._onDragEnd);
  }

  /** Handle dragging movement */
  onDrag(e) {
    this.drawer.style.left = (e.clientX - this.offsetX) + 'px';
    this.drawer.style.top = (e.clientY - this.offsetY) + 'px';
  }

  /** End dragging */
  onDragEnd() {
    document.removeEventListener('mousemove', this._onDragMove);
    document.removeEventListener('mouseup', this._onDragEnd);
  }
}