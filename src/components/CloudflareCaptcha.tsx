import React, { useState, useCallback, useEffect } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  verificationDelay?: number;
}

// Cloudflare logo (kept above the captcha)
const CloudflareLogo: React.FC = () => (
  <img
    src="https://static.cdnlogo.com/logos/c/93/cloudflare-thumb.png"
    alt="Cloudflare"
    className="w-20 h-20 object-contain drop-shadow-lg pointer-events-none"
  />
);

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
      className="min-h-screen flex flex-col items-center p-4"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1618242537685-bdc08d6311b3?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1974')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background logo placed near the top center (visual only) */}
      <div className="mt-[8vh] flex items-center justify-center pointer-events-none">
        <CloudflareLogo />
      </div>

      {/* Captcha control: below the logo.
          Increased visibility: larger clickable area, stronger contrast, soft glow and blur so it blends
          with the photo while remaining clearly visible on bright/dark regions. No hard card edges are shown. */}
      <div className="mt-6 flex items-center flex-col">
        {/* Accessible live region for screen readers */}
        <div className="sr-only" aria-live="polite">
          {liveMessage}
        </div>

        {/* The control is a single large pill-shaped button that blends into the background but uses
            a soft outline/glow, stronger backdrop blur and slightly increased opacity so it stands out on desktop. */}
        <button
          type="button"
          onClick={handleVerify}
          onKeyDown={handleKeyDown}
          disabled={isVerifying || isVerified}
          aria-pressed={isVerified}
          aria-label="Verify you are human"
          className={`flex items-center gap-3 px-4 py-2 rounded-full transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-white/60 select-none
            shadow-[0_6px_18px_rgba(0,0,0,0.45)]`}
          style={{
            // translucent dark-ish layer so the control is visible on both light and dark areas of the photo
            background: 'linear-gradient(180deg, rgba(8,10,15,0.18), rgba(8,10,15,0.12))',
            WebkitBackdropFilter: 'blur(8px)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <span
            className={`flex items-center justify-center rounded-full transition-all duration-150 ${
              isVerified ? 'bg-green-500' : isVerifying ? 'bg-white/10' : 'bg-white/10 hover:bg-white/20'
            }`}
            // responsive size: larger on desktop
            style={{
              width: 36,
              height: 36,
              boxShadow: isVerified ? '0 6px 14px rgba(34,197,94,0.35)' : '0 4px 12px rgba(0,0,0,0.35)',
              border: isVerified ? 'none' : '1px solid rgba(255,255,255,0.12)'
            }}
            aria-hidden="true"
          >
            {isVerifying ? (
              <Spinner size="sm" />
            ) : isVerified ? (
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              // visible checkbox indicator for default state
              <svg
                className="w-4 h-4 text-white/90"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" fill="rgba(255,255,255,0.02)"/>
              </svg>
            )}
          </span>

          <span
            className="text-sm md:text-base font-medium"
            style={{ color: 'rgba(255,255,255,0.95)', textShadow: '0 1px 0 rgba(0,0,0,0.45)' }}
          >
            I'm not a robot
          </span>
        </button>
      </div>
    </div>
  );
};

export default CloudflareCaptcha;
