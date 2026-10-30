import { useEffect, useState, useRef } from 'react';

const SPLASH_LOGO_URL = 'https://res.cloudinary.com/pyjyrmry/image/upload/v1793352216/dungeons_hero_assets/dungeons_splash_logo.jpg';

export function BrandIntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit' | 'done'>('enter');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timerRefs.current.push(t);
      return t;
    };

    // 6.5 - 7.0 seconds total cinematic logo animation
    schedule(() => setPhase('show'), 300);
    schedule(() => setPhase('exit'), 5800);
    schedule(() => {
      setPhase('done');
      onComplete();
    }, 6800);

    return () => timerRefs.current.forEach(clearTimeout);
  }, [onComplete]);

  const handleSkip = () => {
    setPhase('done');
    onComplete();
  };

  if (phase === 'done') return null;

  return (
    <div
      className={`dungeons-splash-intro-overlay ${phase}`}
      onClick={handleSkip}
      role="dialog"
      aria-label="Welcome to DUNGEONS"
    >
      <div className="dungeons-splash-logo-container">
        <img
          src={SPLASH_LOGO_URL}
          alt="DUNGEONS"
          className="dungeons-splash-logo-img"
        />
      </div>
      <button type="button" className="dungeons-splash-skip-btn" onClick={handleSkip}>
        Skip
      </button>
    </div>
  );
}
