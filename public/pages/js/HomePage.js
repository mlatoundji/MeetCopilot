import HomePageDashboard from './HomePageDashboard.js';

export class HomePage {
  constructor(app) {
    this.app = app;
    this.homePageDashboard = new HomePageDashboard(this.app);
  }

  async render() {
    // Show global header and main sidebar on home page
    const header = document.querySelector('.header-horizontal');
    if (header) header.style.display = '';
    const mainSidebar = document.querySelector('.sidebar');
    if (mainSidebar) mainSidebar.style.display = '';
    // Initialize the home page and show dashboard fragment by default
    await this.homePageDashboard.init();
  }
}

export default HomePage; 