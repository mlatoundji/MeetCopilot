'use client';
import React from 'react';
import Link from 'next/link';
import CollapseSidebar from './CollapseSidebar';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
  return (
    <div className="header-horizontal">
      <CollapseSidebar />
      <Link href="/home" aria-label="Go to home" className="logo-link">
        <img src="/assets/ai-mi-algorithm-svgrepo-com-CyUtkQg-.png" alt="Logo" width={28} height={28} />
        <span className="logo-text">Meet Copilot</span>
      </Link>
      <div className="header-controls" style={{ marginLeft: 'auto' }}>
        <select id="langSelect" className="lang-select" title="Language" />
        <ThemeToggle />
        <button id="userProfile" className="button-icon" title="User Profile">
          <span className="profile-icon">👤</span>
        </button>
      </div>
    </div>
  );
};

export default Header; 