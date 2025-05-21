export class UI {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'light';
    this.setupTheme();
    this.setupSidebar();
    this.setupMeetingSidebar();
  }

  setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeSelect = document.getElementById('themeSelect');
    const html = document.documentElement;

    // Set initial theme
    html.setAttribute('data-theme', this.theme);
    if (themeSelect) {
      themeSelect.value = this.theme;
    }

    // Theme toggle button
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        this.updateThemeIcon();
      });
    }

    // Theme select dropdown
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.theme = e.target.value;
        html.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        this.updateThemeIcon();
      });
    }

    this.updateThemeIcon();
  }

  updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = this.theme === 'light' ? '🌙' : '☀️';
    }
  }

  setupSidebar() {
    const collapseButton = document.getElementById('collapseSidebar');
    const sidebar = document.querySelector('.sidebar');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    // Collapse/expand logic with mobile open and outside-click closing
    if (collapseButton && sidebar) {
      const onCollapseClick = (e) => {
        e.stopPropagation();
        if (window.innerWidth <= 600) {
          sidebar.classList.toggle('open');
        } else {
          sidebar.classList.toggle('collapsed');
        }
      };
      collapseButton.addEventListener('click', onCollapseClick);
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 600 && sidebar.classList.contains('open')) {
          if (!sidebar.contains(e.target) && e.target !== collapseButton) {
            sidebar.classList.remove('open');
          }
        }
      });
    }

    // Active state and navigation
    sidebarItems.forEach(item => {
      item.addEventListener('click', () => {
        sidebarItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const hash = item.getAttribute('data-hash');
        if (hash) {
          window.location.hash = hash;
        }
      });
    });

    // Highlight active item on hash change
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      sidebarItems.forEach(item => {
        if (item.getAttribute('data-hash') === hash) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    });
  }

  // Utility method to show notifications
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Add animation classes
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  hideSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if(sidebar) sidebar.style.display='none';
  }
  showSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if(sidebar) sidebar.style.display='';
  }

  setupMeetingSidebar() {
    const initToggle = () => {
      const collapseBtn = document.getElementById('collapseMeetingSidebar');
      const meetingSidebar = document.querySelector('.meeting-sidebar');
      if (!collapseBtn || !meetingSidebar) return;
      // Avoid multiple listeners
      collapseBtn.onclick = () => {
        meetingSidebar.classList.toggle('collapsed');
      };
    };
    // run now and whenever hash changes (home→meeting etc.)
    initToggle();
    window.addEventListener('hashchange', initToggle);
  }
} 