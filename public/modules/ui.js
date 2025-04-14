export class UI {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'light';
    this.setupTheme();
    this.setupTabs();
    this.setupSidebar();
    this.setupTranscription();
    this.setupResponsive();
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

  setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs and panes
        tabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        // Add active class to clicked tab and corresponding pane
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      });
    });
  }

  setupSidebar() {
    const collapseButton = document.getElementById('collapseSidebar');
    const sidebar = document.querySelector('.sidebar');

    if (collapseButton && sidebar) {
      collapseButton.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        // Update button icon
        collapseButton.textContent = sidebar.classList.contains('collapsed') ? '☰' : '✕';
      });
    }
  }

  setupTranscription() {
    const moveButton = document.getElementById('moveTranscription');
    const transcription = document.querySelector('.transcription');
    const mainContent = document.querySelector('.main-content');

    if (moveButton && transcription && mainContent) {
      let isMoved = false;
      moveButton.addEventListener('click', () => {
        isMoved = !isMoved;
        if (isMoved) {
          mainContent.appendChild(transcription);
          transcription.style.position = 'absolute';
          transcription.style.top = '50%';
          transcription.style.left = '50%';
          transcription.style.transform = 'translate(-50%, -50%)';
          transcription.style.width = '80%';
          transcription.style.height = '80%';
          transcription.style.zIndex = '1000';
        } else {
          document.querySelector('.container').appendChild(transcription);
          transcription.style.position = '';
          transcription.style.top = '';
          transcription.style.left = '';
          transcription.style.transform = '';
          transcription.style.width = '';
          transcription.style.height = '';
          transcription.style.zIndex = '';
        }
      });
    }
  }

  setupResponsive() {
    const handleResize = () => {
      const container = document.querySelector('.container');
      const sidebar = document.querySelector('.sidebar');
      const transcription = document.querySelector('.transcription');

      if (window.innerWidth <= 900) {
        if (transcription) {
          transcription.style.display = 'none';
        }
        if (sidebar) {
          sidebar.classList.add('collapsed');
        }
      } else {
        if (transcription) {
          transcription.style.display = '';
        }
        if (sidebar) {
          sidebar.classList.remove('collapsed');
        }
      }

      if (window.innerWidth <= 600) {
        if (sidebar) {
          sidebar.style.display = 'none';
        }
      } else {
        if (sidebar) {
          sidebar.style.display = '';
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
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
} 