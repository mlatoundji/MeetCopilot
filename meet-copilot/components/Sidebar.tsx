import React from 'react';

interface SidebarItemProps {
  nav: string;
  label: string;
  icon: React.ReactNode;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ nav, label, icon }) => (
  <li className="sidebar-item" data-nav={nav} data-hash={nav}>
    <span className="sidebar-bar" aria-label={label}>{icon}</span>
    <span className="sidebar-label">{label}</span>
  </li>
);

const Sidebar: React.FC = () => (
  <aside className="sidebar" id="main-sidebar">
    <nav className="sidebar-nav">
      <ul className="sidebar-menu">
        <SidebarItem nav="dashboard" label="Dashboard" icon="🏠" />
        <SidebarItem nav="sessions" label="Sessions" icon="🧾" />
      </ul>
      <div className="sidebar-separator" />
      <ul className="sidebar-menu">
        <SidebarItem nav="settings" label="Settings" icon="⚙️" />
      </ul>
      <div className="sidebar-separator" />
      <ul className="sidebar-menu">
        <SidebarItem nav="profile" label="Profile" icon="🙍‍♂️" />
      </ul>
    </nav>
  </aside>
);

export default Sidebar; 