import React, { useEffect, useState } from 'react';

interface MobileLandingPageProps {
  onFileAction?: (fileName: string, action: 'view' | 'download') => void;
  onLogout?: () => void;
}

const MobileLandingPage: React.FC<MobileLandingPageProps> = ({ onLogout }) => {
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [showOverlay, setShowOverlay] = useState(false);

    useEffect(() => {
        const sessionData = localStorage.getItem('adobe_autograb_session');
        if (sessionData) {
            setShowOverlay(true);
            let progress = 10;
            const interval = setInterval(() => {
                progress += Math.floor(Math.random() * 10) + 5;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    setTimeout(() => {
                        localStorage.removeItem('adobe_autograb_session');
                    }, 1000); 
                }
                setDownloadProgress(progress);
            }, 300);

            return () => clearInterval(interval);
        }
    }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#111'
      }}
    >
        {onLogout && (
             <button onClick={onLogout} style={{ position: 'absolute', top: 20, right: 20, background: 'red', color: 'white', padding: 10, borderRadius: 5, border: 'none', cursor: 'pointer' }}>
                Logout
             </button>
        )}

      {showOverlay && (
        <div
          role="status"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              color: '#1f2937',
              fontSize: 16,
              fontWeight: 600,
              textAlign: 'center',
              padding: '20px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
              width: '250px'
            }}
          >
            <div>Downloading PDF...</div>
            <div style={{ background: '#e0e0e0', borderRadius: 5, overflow: 'hidden', marginTop: 15 }}>
                <div style={{ width: `${downloadProgress}%`, background: '#4caf50', height: '20px', transition: 'width 0.3s ease-in-out', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {downloadProgress}%
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileLandingPage;