export class LandingPage {
  constructor(app) {
    this.app = app;
    this.container = document.querySelector('.container');
    this.landingRoot = document.createElement('div');
    this.landingRoot.id = 'landing-root';
    this.landingRoot.style.width = '100%';
    this.landingRoot.style.minHeight = '100vh';
    this.landingRoot.style.overflowY = 'auto';
  }
  async render() {
    // Hide app chrome
    if(this.container) this.container.style.display='none';
    this.app.ui.hideSidebar();
    const transcription = document.querySelector('.transcription');
    if(transcription) transcription.style.display='none';

    // Load fragment
    const res = await fetch('pages/html/landing.html');
    const html = await res.text();
    this.landingRoot.innerHTML = html;
    if(!document.getElementById('landing-root')) document.body.appendChild(this.landingRoot);

    // CTA buttons navigate
    this.landingRoot.addEventListener('click',(e)=>{
      const btn=e.target.closest('[data-hash]');
      if(btn){
        window.location.hash=btn.getAttribute('data-hash');
      }
    });
  }
  destroy(){
    // Remove landing root and restore app chrome
    if(this.landingRoot.parentElement) this.landingRoot.parentElement.removeChild(this.landingRoot);
    if(this.container) this.container.style.display='grid';
    this.app.ui.showSidebar();
    const transcription = document.querySelector('.transcription');
    if(transcription) transcription.style.display='';
  }
} 