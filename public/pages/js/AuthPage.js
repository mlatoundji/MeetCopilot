import { APIHandler } from '../../modules/apiHandler.js';

export default class AuthPage {
  constructor(app) {
    this.app = app;
    this.container = document.querySelector('.container');
    this.loginRoot = document.createElement('div');
    this.loginRoot.id = 'login-root';
    this.loginRoot.style.width = '100%';
    this.loginRoot.style.minHeight = '100vh';
    this.loginRoot.style.overflowY = 'auto';
    this.apiHandler = new APIHandler();
  }

  async render() {
    // Hide main application UI
    if (this.container) this.container.style.display = 'none';
    this.app.ui.hideSidebar();
    const transcription = document.querySelector('.transcription');
    if (transcription) transcription.style.display = 'none';

    // Load the combined auth (login/register) HTML
    const res = await fetch('pages/html/auth.html');
    const html = await res.text();
    this.loginRoot.innerHTML = html;

    // Append to DOM if not already present
    if (!document.getElementById('login-root')) {
      document.body.appendChild(this.loginRoot);
    }

    this.initializeEvents();
  }

  initializeEvents() {
    const slider = this.loginRoot.querySelector('.slider');
    const loginBtn = this.loginRoot.querySelector('.login-btn');
    const signupBtn = this.loginRoot.querySelector('.signup-btn');
    const formSection = this.loginRoot.querySelector('.form-section');

    if (loginBtn && signupBtn) {
      this.loginHandler = () => {
        slider.classList.remove('moveslider');
        formSection.classList.remove('form-section-move');
      };
      this.signupHandler = () => {
        slider.classList.add('moveslider');
        formSection.classList.add('form-section-move');
      };
      loginBtn.addEventListener('click', this.loginHandler);
      signupBtn.addEventListener('click', this.signupHandler);
    }

    // Login submission
    const loginSubmit = this.loginRoot.querySelector('#login-submit');
    if (loginSubmit) {
      this.loginSubmitHandler = async (e) => {
        e.preventDefault();
        const email = this.loginRoot.querySelector('#login-email').value;
        const password = this.loginRoot.querySelector('#login-password').value;
        const btn = loginSubmit;
        btn.disabled = true;
        try {
          const resp = await this.apiHandler.callApi(
            `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/login`,
            { method: 'POST', body: JSON.stringify({ email, password }) }
          );
          const token = resp.access_token;
          if (!token) throw new Error(resp.error || 'Authentication failed');
          localStorage.setItem('jwt', token);
          window.location.hash = 'home';
        } catch (err) {
          alert(err.message);
        } finally {
          btn.disabled = false;
        }
      };
      loginSubmit.addEventListener('click', this.loginSubmitHandler);
    }

    // Registration submission
    const registerSubmit = this.loginRoot.querySelector('#register-submit');
    if (registerSubmit) {
      this.registerSubmitHandler = async (e) => {
        e.preventDefault();
        const form = this.loginRoot.querySelector('#register-form');
        const name = form.querySelector('input[type="text"]').value;
        const email = form.querySelector('input[type="email"]').value;
        const passwords = form.querySelectorAll('input[type="password"]');
        const password = passwords[0].value;
        const confirmPassword = passwords[1].value;
        if (password !== confirmPassword) {
          alert('Les mots de passe ne correspondent pas.');
          return;
        }
        const btn = registerSubmit;
        btn.disabled = true;
        try {
          const resp = await this.apiHandler.callApi(
            `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/register`,
            { method: 'POST', body: JSON.stringify({ email, password }) }
          );
          const token = resp.access_token;
          if (!token) throw new Error(resp.error || 'Registration failed');
          localStorage.setItem('jwt', token);
          window.location.hash = 'home';
        } catch (err) {
          alert(err.message);
        } finally {
          btn.disabled = false;
        }
      };
      registerSubmit.addEventListener('click', this.registerSubmitHandler);
    }
  }

  destroy() {
    // Remove event listeners
    const loginBtn = this.loginRoot.querySelector('.login-btn');
    const signupBtn = this.loginRoot.querySelector('.signup-btn');
    const loginSubmit = this.loginRoot.querySelector('#login-submit');
    const registerSubmit = this.loginRoot.querySelector('#register-submit');

    if (loginBtn && this.loginHandler) {
      loginBtn.removeEventListener('click', this.loginHandler);
    }
    if (signupBtn && this.signupHandler) {
      signupBtn.removeEventListener('click', this.signupHandler);
    }
    if (loginSubmit && this.loginSubmitHandler) {
      loginSubmit.removeEventListener('click', this.loginSubmitHandler);
    }
    if (registerSubmit && this.registerSubmitHandler) {
      registerSubmit.removeEventListener('click', this.registerSubmitHandler);
    }

    // Remove root and restore main UI
    if (this.loginRoot.parentElement) {
      this.loginRoot.parentElement.removeChild(this.loginRoot);
    }
    if (this.container) this.container.style.display = 'grid';
    this.app.ui.showSidebar();
    const transcription = document.querySelector('.transcription');
    if (transcription) transcription.style.display = '';
  }
} 