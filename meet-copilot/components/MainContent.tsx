import React from 'react';

const MainContent: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <main className="main-content" id="main-content">
    {children}
  </main>
);

export default MainContent; 