import type { Metadata } from "next";
import "./globals.css";
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Script from 'next/script';

export const metadata: Metadata = {
  title: "Meet Copilot",
  description: "AI-powered meeting assistant that plans sessions, captures audio, transcribes conversations, and generates summaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white antialiased" suppressHydrationWarning>
        <Script
          id="cleanup-inline-styles"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Clean up any inline styles that might cause hydration mismatch
                function cleanupInlineStyles() {
                  try {
                    const body = document.body;
                    if (body && body.style.zIndex) {
                      body.style.removeProperty('z-index');
                    }
                    // Remove any other problematic inline styles
                    if (body && body.hasAttribute('style')) {
                      const style = body.getAttribute('style');
                      if (style && style.includes('z-index')) {
                        body.setAttribute('style', style.replace(/z-index[^;]*;?/g, ''));
                      }
                    }
                  } catch (e) {
                    // Ignore cleanup errors
                  }
                }
                
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', cleanupInlineStyles);
                } else {
                  cleanupInlineStyles();
                }
              })();
            `,
          }}
        />
        <div className="flex flex-col h-screen">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
