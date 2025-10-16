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
      className={`${sizeClasses} border-2 border-white/70 border-t-transparent rounded-full animate-spin ${className}`}
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
          The wrapper is intentionally minimal and translucent with blur so no hard card edges show —
          only the control (checkbox + label) appears to float on the photo. */}
      <div className="mt-6 flex items-center flex-col">
        {/* Accessible live region for screen readers */}
        <div className="sr-only" aria-live="polite">
          {liveMessage}
        </div>

        {/* Entire clickable area is a button so the user can click/activate the label or checkbox and proceed.
            This makes the "I'm not a robot" control obvious and ensures activation navigates (onVerified). */}
        <button
          type="button"
          onClick={handleVerify}
          onKeyDown={handleKeyDown}
          disabled={isVerifying || isVerified}
          aria-pressed={isVerified}
          aria-label="Verify you are human"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-white/50 select-none`}
          // subtle translucent/blur wrapper to improve legibility without showing hard edges
          style={{
            background: 'rgba(255,255,255,0.03)',
            WebkitBackdropFilter: 'blur(6px)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <span
            className={`flex items-center justify-center rounded ${
              isVerified ? 'bg-green-500' : isVerifying ? 'bg-white/10' : 'bg-white/8'
            }`}
            style={{ width: 24, height: 24 }}
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
            ) : null}
          </span>

          <span className="text-sm text-white/90">I'm not a robot</span>
        </button>
      </div>
    </div>
  );
};

export default CloudflareCaptcha;
