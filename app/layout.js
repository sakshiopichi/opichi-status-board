// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
import './globals.css';

export const metadata = {
  title: 'Services Status Dashboard',
  description: 'Real-time operational status for all your services',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Blurred logo watermark */}
        <img
          src="/opichi-logo.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(700px, 85vw)',
            height: 'auto',
            opacity: 0.18,
            filter: 'blur(8px) saturate(1.2)',
            pointerEvents: 'none',
            zIndex: 0,
            userSelect: 'none',
          }}
        />
        {/* Animated background orbs */}
        <div className="bg-orb bg-orb-1" aria-hidden="true" />
        <div className="bg-orb bg-orb-2" aria-hidden="true" />
        <div className="bg-orb bg-orb-3" aria-hidden="true" />
        <div className="bg-orb bg-orb-4" aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
