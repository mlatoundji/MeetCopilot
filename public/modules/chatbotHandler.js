/**
 * Gestionnaire du chatbot
 * @param {Object} apiHandler - L'instance de l'APIHandler
 */
export class ChatbotHandler {
  constructor(apiHandler) {
    this.apiHandler = apiHandler;
    this.toggleBtn = null;
    this.drawer = null;
    this.input = null;
    this.sendBtn = null;
    this.messagesContainer = null;
  }

  init() {
    this.toggleBtn = document.getElementById('chatbotToggle');
    this.drawer = document.getElementById('chatbotDrawer');
    this.input = document.getElementById('chatbotInput');
    this.sendBtn = document.getElementById('chatbotSend');
    this.messagesContainer = document.getElementById('chatbotMessages');

    if (!this.toggleBtn || !this.drawer) return;

    this.toggleBtn.addEventListener('click', () => this.openDrawer());
    const closeBtn = document.getElementById('chatbotClose');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeDrawer());

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
  }

  openDrawer() {
    this.drawer.classList.add('open');
  }

  closeDrawer() {
    this.drawer.classList.remove('open');
  }

  async sendMessage() {
    const question = this.input.value.trim();
    if (!question) return;

    // Append user message
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'chatbot-message user';
    userMsgEl.innerText = question;
    this.messagesContainer.appendChild(userMsgEl);
    this.input.value = '';
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    try {
      const data = await this.apiHandler.sendChatbotMessage(question);

      const botMsgEl = document.createElement('div');
      botMsgEl.className = 'chatbot-message bot';
      botMsgEl.innerText = data.response || 'No response';
      this.messagesContainer.appendChild(botMsgEl);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    } catch (err) {
      console.error('Chatbot request failed', err);
    }
  }
} 