import React, { useEffect, useRef, useState } from 'react';

interface MobileLandingPageProps {
  onFileAction?: (fileName: string, action: 'view' | 'download') => void;
}

/**
 * Behavior per request:
 * - Realistic PDF viewer animation.
 * - Flow: "Downloading..." -> "Download Successful" -> keep the success text visible.
 * - Text readable without high-contrast outlines.
 * - Session gating + remove 'adobe_autograb_session' on completion.
 * - The provided image is displayed inside the page frame (centered, contained).
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
    } catch {}

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
        background: '#f5f7fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#111'
      }}
    >
      {/* Document.pdf card removed as requested */}

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
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.95)',
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
}

// Keeping RealisticPDFMobile definition unchanged below (not rendered).
function RealisticPDFMobile({ animating, imageUrl }: { animating: boolean; imageUrl: string }) {
  return (
    <div style={{ position: 'relative' }} aria-hidden="true">
      <style>
        {`
          .pdf-viewer-m {
            width: 270px;
            border-radius: 12px;
            background: #e9eef3;
            box-shadow: 0 14px 36px rgba(0,0,0,0.12);
            border: 1px solid #d8e0e8;
            overflow: hidden;
          }

          .pdf-toolbar-m {
            height: 42px;
            background: linear-gradient(0deg, #f7fafc, #ffffff);
            border-bottom: 1px solid #e6ebf1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 8px 0 10px.
          }
          .pdf-toolbar-left-m {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #374151;
            font-weight: 600;
            font-size: 12px.
          }
          .pdf-toolbar-dots-m { display: inline-flex; gap: 5px; margin-right: 4px; }
          .pdf-toolbar-dots-m i { width: 7px; height: 7px; border-radius: 50%; }
          .pdf-toolbar-dots-m i:nth-child(1) { background: #ef4444; }
          .pdf-toolbar-dots-m i:nth-child(2) { background: #f59e0b; }
          .pdf-toolbar-dots-m i:nth-child(3) { background: #10b981; }

          .pdf-badge-m {
            background: #e53935;
            color: #fff;
            font-weight: 700;
            font-size: 9px;
            padding: 3px 7px;
            border-radius: 999px;
          }

          .pdf-viewport-m {
            height: 380px;
            background: radial-gradient(120% 50% at 50% 0%, #f8fafc 0%, #eef2f7 60%, #e9eef3 100%);
            display: grid;
            place-items: center;
            padding: 14px 0;
          }

          .pages-track-m { position: relative; width: 220px; height: 100%; perspective: 700px; }
          .page-stack-m { position: absolute; inset: 0; display: grid; place-items: center; }

          .page-m {
            position: relative;
            width: 220px;
            height: 312px;
            background: #fff;
            border-radius: 10px;
            box-shadow:
              0 1px 0 rgba(0,0,0,0.05),
              0 6px 16px rgba(0,0,0,0.12);
            border: 1px solid rgba(0,0,0,0.06);
          }
          .page-m.back { transform: translateY(7px) scale(0.995); filter: saturate(0.95) brightness(0.995); }
          .page-m.back2 { transform: translateY(14px) scale(0.99); filter: saturate(0.92) brightness(0.99); }

          .curl-m {
            position: absolute;
            top: 0; right: 0;
            width: 30px; height: 30px;
            background: linear-gradient(135deg, #f3f6fb 0%, #e5ebf2 70%, rgba(0,0,0,0) 71%);
            clip-path: polygon(100% 0, 0 0, 100% 100%);
            border-top-right-radius: 10px;
          }

          .content-m {
            position: absolute;
            inset: 14px 16px 16px 16px;
            display: flex;
            flex-direction: column;
            gap: 0;
            background: #fff;
            border-radius: 8px;
          }

          .imagePreview-m {
            flex: 1;
            border: 1px solid #dbe3ed;
            border-radius: 8px;
            background: #fff;
            display: grid;
            place-items: center;
            overflow: hidden;
          }

          @keyframes floatDocM {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-7px); }
            100% { transform: translateY(0px); }
          }
          .page-m.front.anim { animation: floatDocM 3s ease-in-out infinite; transform-origin: 50% 100%; }

          .turn-glint-m {
            position: absolute;
            top: 9px;
            right: 0;
            width: 9px;
            height: calc(100% - 18px);
            background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(220,230,240,0.6) 80%, rgba(0,0,0,0) 100%);
            opacity: 0;
          }
          @keyframes glintSweepM {
            0% { opacity: 0; transform: translateX(9px); }
            20% { opacity: 0.5; transform: translateX(-2px); }
            100% { opacity: 0; transform: translateX(-10px); }
          }
          .page-m.front.anim .turn-glint-m { animation: glintSweepM 2.6s ease-in-out infinite; }

          @media (prefers-reduced-motion: reduce) {
            .page-m.front.anim, .page-m.front.anim .turn-glint-m { animation: none !important; }
          }
        `}
      </style>

      <div className="pdf-viewer-m">
        <div className="pdf-toolbar-m">
          <div className="pdf-toolbar-left-m">
            <span className="pdf-toolbar-dots-m" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
            <span>Document.pdf</span>
          </div>
          <span className="pdf-badge-m">PDF</span>
        </div>

        <div className="pdf-viewport-m">
          <div className="pages-track-m">
            <div className="page-stack-m">
              <div className="page-m back2"></div>
              <div className="page-m back"></div>

              <div className={`page-m front ${animating ? 'anim' : ''}`}>
                <div className="curl-m" />
                <div className="turn-glint-m" />
                <div className="content-m">
                  <div className="imagePreview-m">
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
                        const t = e.currentTarget as HTMLImageElement;
                        t.src =
                          'data:image/svg+xml;charset=utf-8,' +
                          encodeURIComponent(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="220"><rect width="100%" height="100%" fill="#fff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="12" fill="#999">Preview unavailable</text></svg>'
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

export default MobileLandingPage;
