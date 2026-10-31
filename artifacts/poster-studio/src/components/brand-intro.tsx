import { useEffect, useState, useRef } from 'react';

const SPLASH_LOGO_URL = 'https://res.cloudinary.com/pyjyrmry/image/upload/e_make_transparent/v1793352216/dungeons_hero_assets/dungeons_splash_logo.png';

export function BrandIntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit' | 'done'>('enter');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timerRefs.current.push(t);
      return t;
    };

    // Exactly 4.0 seconds cinematic logo animation centered for all screen sizes
    schedule(() => setPhase('show'), 200);
    schedule(() => setPhase('exit'), 3200);
    schedule(() => {
      setPhase('done');
      onComplete();
    }, 4000);

    return () => timerRefs.current.forEach(clearTimeout);
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <div
      className={`dungeons-splash-intro-overlay ${phase}`}
      role="dialog"
      aria-label="Welcome to DUNGEONS"
    >
      <div className="dungeons-splash-logo-container">
        <img
          src={SPLASH_LOGO_URL}
          alt="DUNGEONS"
          width="220"
          height="220"
          fetchPriority="high"
          className="dungeons-splash-logo-img"
        />
      </div>
    </div>
  );
}
