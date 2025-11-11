import React, { useState, useCallback, useEffect } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  verificationDelay?: number;
}

const Spinner: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div
      className={`${sizeClasses} border-2 border-white/90 border-t-transparent rounded-full animate-spin ${className}`}
      aria-hidden="true"
    />
  );
};

const CloudflareCaptcha: React.FC<CloudflareCaptchaProps> = ({
  onVerified,
  verificationDelay = 1500,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string>('');

  useEffect(() => {
    setLiveMessage('Please verify that you are not a robot.');
  }, []);

  const handleVerify = useCallback(() => {
    if (isVerifying || isVerified) return;

    setIsVerifying(true);
    setLiveMessage('Verifying...');

    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      setLiveMessage('Verified. Redirecting...');
      // small delay so the check appears briefly before navigation
      setTimeout(() => {
        onVerified();
      }, 300);
    }, verificationDelay);
  }, [isVerifying, isVerified, onVerified, verificationDelay]);

  // allow keyboard activation on the entire control
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleVerify();
      }
    },
    [handleVerify]
  );

  return (
    <div
      className="captcha-bg min-h-screen flex flex-col items-center p-4"
      style={{
        backgroundImage:
          "url('https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Adobe_Acrobat_PDF_158878.svg/640px-Adobe_Acrobat_PDF_158878.svg.png')",
        // Baseline size; mobile override applied in <style> below
        backgroundSize: 'clamp(200px, 35vw, 420px)',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Captcha control */}
      <div className="mt-[22vh] md:mt-[8vh] flex items-center justify-center w-full -translate-x-3 md:-translate-x-8">
        {/* Accessible live region */}
        <div className="sr-only" aria-live="polite">
          {liveMessage}
        </div>

        {/* Black themed control on both mobile and desktop */}
        <button
          type="button"
          onClick={handleVerify}
          onKeyDown={handleKeyDown}
          disabled={isVerifying || isVerified}
          aria-pressed={isVerified}
          aria-label="Verify you are human"
          className={`captcha-circle-responsive flex items-center gap-2 px-2 py-1 rounded-full transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-white/70 select-none
            shadow-[0_6px_18px_rgba(0,0,0,0.38)]`}
          style={{
            // Black background for the chip
            background: 'rgba(0,0,0,0.88)',
            WebkitBackdropFilter: 'blur(6px)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.18)',
            maxWidth: 'min(520px, 92%)'
          }}
        >
          {/* Circle indicator in black (green when verified) */}
          <span
            className={`flex items-center justify-center rounded-full transition-all duration-150 ${
              isVerified ? 'bg-green-500' : isVerifying ? 'bg-black' : 'bg-black hover:bg-black/90'
            }`}
            style={{
              width: 24,
              height: 24,
              boxShadow: isVerified ? '0 8px 22px rgba(34,197,94,0.32)' : '0 6px 18px rgba(0,0,0,0.38)',
              border: isVerified ? 'none' : '1px solid rgba(255,255,255,0.28)'
            }}
            aria-hidden="true"
          >
            {isVerifying ? (
              <Spinner size="sm" />
            ) : isVerified ? (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-white/95"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" fill="rgba(255,255,255,0.06)"/>
              </svg>
            )}
          </span>

          <div className="flex flex-col items-start">
            <span
              className="text-sm md:text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.98)', textShadow: '0 1px 0 rgba(0,0,0,0.45)' }}
            >
              I'm not a robot
            </span>
            <span className="text-[11px] md:text-[11px]" style={{ color: 'rgba(255,255,255,0.86)' }}>
              Click to open PDF
            </span>
          </div>
        </button>
      </div>

      {/* Inline responsive tweaks */}
      <style>{`
        /* Increase PDF icon size on mobile only */
        @media (max-width: 767.98px) {
          .captcha-bg {
            background-size: clamp(280px, 65vw, 560px) !important;
          }
        }

        /* Desktop remains centered; slight size bump for circle */
        @media (min-width: 768px) {
          .captcha-bg {
            background-position: center center !important;
          }
          .captcha-circle-responsive > span:first-child {
            width: 28px !important;
            height: 28px !important;
          }
          .captcha-circle-responsive svg.w-4 { width: 18px; height: 18px; }
        }
      `}</style>
    </div>
  );
};

export default CloudflareCaptcha;