'use client';

import { useState, useEffect } from 'react';

const CollapseSidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  // Hydratation initiale de l'état collapsed (par defaut false)
  useEffect(() => {
    // À terme on pourrait lire localStorage ou context
  }, []);

  // Ajout ou retrait de la classe collapsed sur la sidebar
  useEffect(() => {
    const sidebar = document.getElementById('main-sidebar');
    if (sidebar) {
      if (collapsed) sidebar.classList.add('collapsed');
      else sidebar.classList.remove('collapsed');
    }
  }, [collapsed]);

  return (
    <button
      id="collapseSidebar"
      className="menu-toggle"
      title="Toggle Sidebar"
      onClick={() => setCollapsed((prev) => !prev)}
      style={{ marginRight: '1rem' }}
    >
      {collapsed ? '➤' : '◀'}
    </button>
  );
};

export default CollapseSidebar; 