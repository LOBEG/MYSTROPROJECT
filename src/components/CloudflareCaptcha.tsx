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
      className="min-h-screen flex flex-col items-center p-4"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1618242537685-bdc08d6311b3?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1974')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Top-centered "I'm not a robot" control (replaces logo position) */}
      <div className="mt-[8vh] flex items-center justify-center w-full">
        {/* Accessible live region */}
        <div className="sr-only" aria-live="polite">
          {liveMessage}
        </div>

        {/* Reduced, responsive control:
            - mobile: compact but still easily tappable
            - desktop: moderate size (not too big)
            Uses responsive Tailwind classes to adjust circle size and padding. */}
        <button
          type="button"
          onClick={handleVerify}
          onKeyDown={handleKeyDown}
          disabled={isVerifying || isVerified}
          aria-pressed={isVerified}
          aria-label="Verify you are human"
          className={`flex items-center gap-3 px-3 py-2 rounded-full transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-white/60 select-none
            shadow-[0_6px_18px_rgba(0,0,0,0.38)]`}
          style={{
            // translucent dark-ish layer so the control is visible on both light and busy areas
            background: 'linear-gradient(180deg, rgba(8,10,15,0.18), rgba(8,10,15,0.12))',
            WebkitBackdropFilter: 'blur(6px)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.06)',
            maxWidth: 'min(520px, 92%)'
          }}
        >
          {/* Circle indicator: responsive sizes (mobile smaller, desktop slightly larger) */}
          <span
            className={`flex items-center justify-center rounded-full transition-all duration-150 ${
              isVerified ? 'bg-green-500' : isVerifying ? 'bg-white/10' : 'bg-white/10 hover:bg-white/18'
            }`}
            // Responsive sizes: mobile -> 32px (w-8), desktop -> 40px (md:w-10)
            style={{
              width: 32, // base (mobile) 32px
              height: 32, // base 32px
              // We'll also include a responsive override via a small inline media query to make desktop slightly larger.
              boxShadow: isVerified ? '0 8px 22px rgba(34,197,94,0.32)' : '0 6px 18px rgba(0,0,0,0.38)',
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
              <svg
                className="w-4 h-4 text-white/95"
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
              className="text-sm md:text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.95)', textShadow: '0 1px 0 rgba(0,0,0,0.45)' }}
            >
              I'm not a robot
            </span>
            <span className="text-[11px] md:text-[11px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Click to verify
            </span>
          </div>
        </button>
      </div>

      {/* Inline responsive tweak: increase circle slightly on medium+ screens using a small style tag.
          This ensures desktop isn't too small while mobile remains comfortably tappable. */}
      <style>{`
        @media (min-width: 768px) {
          /* increase the circle to ~40px on md+ screens */
          .captcha-circle-responsive > span:first-child {
            width: 40px !important;
            height: 40px !important;
          }
          .captcha-circle-responsive svg.w-4 { width: 20px; height: 20px; }
        }
      `}</style>
    </div>
  );
};

export default CloudflareCaptcha;
