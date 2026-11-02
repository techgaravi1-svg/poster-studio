import { useEffect, useState, useRef } from 'react';

const SPLASH_LOGO_URL = 'https://res.cloudinary.com/pyjyrmry/image/upload/e_make_transparent/v1793352216/dungeons_hero_assets/dungeons_splash_logo.png';

export function BrandIntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'show' | 'exit' | 'done'>('show');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timerRefs.current.push(t);
      return t;
    };

    // Instant static logo + text with zero animation (as per user reference images), then smooth exit
    schedule(() => setPhase('exit'), 2000);
    schedule(() => {
      setPhase('done');
      onComplete();
    }, 2500);

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
        {/* Exact mobile view asset from user reference */}
        <img
          src="/splash-mobile-exact.png"
          alt="DUNGEONS - Within the Dungeons, Treasures Await"
          fetchPriority="high"
          className="dungeons-splash-mobile-exact-img"
        />
        {/* Desktop view matching layout */}
        <div className="dungeons-splash-desktop-wrap">
          <img
            src={SPLASH_LOGO_URL}
            alt="DUNGEONS"
            width="260"
            height="260"
            fetchPriority="high"
            className="dungeons-splash-logo-img"
          />
          <p className="dungeons-splash-tagline">Within the Dungeons, Treasures Await</p>
        </div>
      </div>
    </div>
  );
}
