import React from 'react';
import Link from 'next/link';

const Header: React.FC = () => {
  return (
    <div className="header-horizontal">
      <button id="collapseSidebar" className="menu-toggle" title="Menu" style={{ marginRight: '1rem' }}>
        <img src="/assets/menu-icon.png" alt="Menu" width={24} height={24} />
      </button>
      <Link href="/home" aria-label="Go to home" className="logo-link">
        <img src="/assets/ai-mi-algorithm-svgrepo-com-CyUtkQg-.png" alt="Logo" width={28} height={28} />
        <span className="logo-text">Meet Copilot</span>
      </Link>
      <div className="header-controls" style={{ marginLeft: 'auto' }}>
        <select id="langSelect" className="lang-select" title="Language" />
        <button id="themeToggle" className="button-icon" title="Toggle Theme">
          <span className="theme-icon">🌙</span>
        </button>
        <button id="userProfile" className="button-icon" title="User Profile">
          <span className="profile-icon">👤</span>
        </button>
      </div>
    </div>
  );
};

export default Header; 