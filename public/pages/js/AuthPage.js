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

  // Initialize the auth page by rendering its content
  async init() {
    await this.render();
  }

  async render() {
    // Hide the main application layout (header/sidebar) and apply auth styles
    const appLayout = document.querySelector('.app-layout-vertical');
    if (appLayout) appLayout.style.display = 'none';
    document.body.classList.remove('no-global-ui'); // ensure CSS from auth.html applies
    const transcription = document.querySelector('.transcription');
    if (transcription) transcription.style.display = 'none';

    // Load the combined auth (login/register) HTML
    const res = await fetch('pages/html/auth.html');
    if (!res.ok) {
      console.error(`Error loading auth HTML: ${res.status} ${res.statusText}`);
      this.loginRoot.innerHTML = `<div class="error">Erreur de chargement du module d'authentification (status: ${res.status})</div>`;
      return;
    }
    const htmlText = await res.text();
    // Parse the fetched HTML to extract styles and the auth container
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    // Append <link> and <style> from auth.html to document head
    doc.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
      document.head.appendChild(node.cloneNode(true));
    });
    // Extract only the main container from auth.html
    const containerLogin = doc.querySelector('.container-login');
    if (containerLogin) {
      this.loginRoot.innerHTML = containerLogin.outerHTML;
    } else {
      this.loginRoot.innerHTML = htmlText;
    }

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
          this.destroy();
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
            { method: 'POST', body: JSON.stringify({ name, email, password }) }
          );
          if (resp.access_token) {
            localStorage.setItem('jwt', resp.access_token);
            this.destroy();
            window.location.hash = 'home';
          } else if (resp.user) {
            alert('Inscription réussie ! Veuillez confirmer votre email avant de vous connecter.');
            slider.classList.remove('moveslider');
            formSection.classList.remove('form-section-move');
          } else {
            throw new Error(resp.error || 'Registration failed');
          }
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

    // Remove auth UI and restore main layout
    if (this.loginRoot.parentElement) {
      this.loginRoot.parentElement.removeChild(this.loginRoot);
    }
    const appLayout = document.querySelector('.app-layout-vertical');
    if (appLayout) appLayout.style.display = 'flex';
    document.body.classList.remove('no-global-ui');
    this.app.ui.showSidebar();
    const transcription = document.querySelector('.transcription');
    if (transcription) transcription.style.display = '';
  }
} 