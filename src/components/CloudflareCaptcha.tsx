import React, { useState, useCallback } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  verificationDelay?: number;
}

// Cloudflare logo (kept as an image so it sits above the captcha)
const CloudflareLogo: React.FC = () => (
  <img
    src="https://static.cdnlogo.com/logos/c/93/cloudflare-thumb.png"
    alt="Cloudflare"
    className="w-20 h-20 object-contain drop-shadow-lg"
  />
);

const Spinner: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div
      className={`${sizeClasses} border-2 border-blue-500 border-t-transparent rounded-full animate-spin ${className}`}
      aria-label="Loading"
    />
  );
};

const CloudflareCaptcha: React.FC<CloudflareCaptchaProps> = ({
  onVerified,
  verificationDelay = 1500,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleCheckboxClick = useCallback(() => {
    if (isVerified || isVerifying) return;

    setIsChecked(true);
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      setTimeout(() => {
        onVerified();
      }, 300);
    }, verificationDelay);
  }, [isVerified, isVerifying, onVerified, verificationDelay]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCheckboxClick();
    }
  }, [handleCheckboxClick]);

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
      {/* Background logo placed near the top center */}
      <div className="mt-[8vh] flex items-center justify-center pointer-events-none">
        <CloudflareLogo />
      </div>

      {/* Captcha only: positioned below the logo, minimal wrapper so no visible card edges show.
          Uses subtle backdrop blur and transparent background so it blends into the photo; only the checkbox + text remain visually distinct. */}
      <div className="mt-6 flex items-center flex-col">
        <div
          className="flex items-center space-x-3 p-1 rounded-md"
          // subtle translucent/blur wrapper to improve readability while avoiding hard edges
          style={{
            background: 'rgba(255,255,255,0.04)',
            WebkitBackdropFilter: 'blur(6px)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div
            className={`w-6 h-6 flex items-center justify-center rounded cursor-pointer transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
              isVerified
                ? `bg-green-500`
                : isVerifying
                ? `border-2 border-blue-400 bg-white/6`
                : `border-2 border-white/10 bg-white/6 hover:bg-white/10`
            }`}
            onClick={handleCheckboxClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="checkbox"
            aria-checked={isVerified}
            aria-label="Verify you are human"
            aria-live="polite"
          >
            {isVerifying && <Spinner size="sm" />}
            {isVerified && (
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
            )}
          </div>

          <span className="text-sm text-white/90 select-none">I'm not a robot</span>
        </div>
      </div>
    </div>
  );
};

export default CloudflareCaptcha;
