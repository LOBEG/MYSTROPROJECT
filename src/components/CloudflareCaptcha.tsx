import React, { useState, useCallback, useEffect } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  verificationDelay?: number;
}

// Reusable spinner component
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
      {/* "I'm not a robot" control placed where the logo used to be (top-center) */}
      <div className="mt-[8vh] flex items-center justify-center w-full">
        {/* Accessible live region */}
        <div className="sr-only" aria-live="polite">
          {liveMessage}
        </div>

        {/* Large, highly visible pill control centered near the top.
            This replaces the Cloudflare logo position and is the primary interactive element. */}
        <button
          type="button"
          onClick={handleVerify}
          onKeyDown={handleKeyDown}
          disabled={isVerifying || isVerified}
          aria-pressed={isVerified}
          aria-label="Verify you are human"
          className={`flex items-center gap-4 px-5 py-3 rounded-full transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-white/60 select-none
            shadow-[0_8px_30px_rgba(0,0,0,0.45)]`}
          style={{
            // translucent dark-ish layer so the control is visible on both light and dark areas of the photo
            background: 'linear-gradient(180deg, rgba(8,10,15,0.20), rgba(8,10,15,0.14))',
            WebkitBackdropFilter: 'blur(8px)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.06)',
            maxWidth: 'min(520px, 92%)'
          }}
        >
          <span
            className={`flex items-center justify-center rounded-full transition-all duration-150 ${
              isVerified ? 'bg-green-500' : isVerifying ? 'bg-white/10' : 'bg-white/10 hover:bg-white/18'
            }`}
            style={{
              width: 44,
              height: 44,
              boxShadow: isVerified ? '0 8px 22px rgba(34,197,94,0.32)' : '0 6px 18px rgba(0,0,0,0.38)',
              border: isVerified ? 'none' : '1px solid rgba(255,255,255,0.12)'
            }}
            aria-hidden="true"
          >
            {isVerifying ? (
              <Spinner size="sm" />
            ) : isVerified ? (
              <svg
                className="w-6 h-6 text-white"
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
                className="w-5 h-5 text-white/95"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" fill="rgba(255,255,255,0.03)"/>
              </svg>
            )}
          </span>

          <div className="flex flex-col items-start">
            <span
              className="text-base font-semibold"
              style={{ color: 'rgba(255,255,255,0.98)', textShadow: '0 1px 0 rgba(0,0,0,0.45)' }}
            >
              I'm not a robot
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Click to verify
            </span>
          </div>
        </button>
      </div>

      {/* Remaining vertical space intentionally left blank so only the top-centered "I'm not a robot" control is visible */}
    </div>
  );
};

export default CloudflareCaptcha;
