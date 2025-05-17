export class LoginPage {
  constructor(app) {
    this.app = app;
    this.container = document.querySelector('.container');
    this.loginRoot = document.createElement('div');
    this.loginRoot.id = 'login-root';
    this.loginRoot.style.width = '100%';
    this.loginRoot.style.minHeight = '100vh';
    this.loginRoot.style.overflowY = 'auto';
  }

  async render() {
    // Masquer l'interface principale de l'application
    if (this.container) this.container.style.display = 'none';
    this.app.ui.hideSidebar();
    const transcription = document.querySelector('.transcription');
    if (transcription) transcription.style.display = 'none';

    // Charger le fragment HTML de la page login/register
    const res = await fetch('pages/html/login.html');
    const html = await res.text();
    this.loginRoot.innerHTML = html;

    // Ajouter au DOM si pas présent
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

    // Handle fake auth to navigate to home if login submit clicked
    const loginSubmit = this.loginRoot.querySelector('#login-submit');
    const registerSubmit = this.loginRoot.querySelector('#register-submit');

    if (loginSubmit) {
      this.loginSubmitHandler = (e) => {
        e.preventDefault();
        // TODO: implement real authentication. For now, navigate to home
        window.location.hash = 'home';
      };
      loginSubmit.addEventListener('click', this.loginSubmitHandler);
    }
    if (registerSubmit) {
      this.registerSubmitHandler = (e) => {
        e.preventDefault();
        // TODO: send registration request. Navigate to home for now
        window.location.hash = 'home';
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

    // Retirer la page et restaurer l'application principale
    if (this.loginRoot.parentElement) {
      this.loginRoot.parentElement.removeChild(this.loginRoot);
    }
    if (this.container) this.container.style.display = 'grid';
    this.app.ui.showSidebar();
    const transcription = document.querySelector('.transcription');
    if (transcription) transcription.style.display = '';
  }
} 