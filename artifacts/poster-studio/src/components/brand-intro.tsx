import { useEffect, useState, useRef } from 'react';

// 4K Ultra HD crisp transparent logo
const SPLASH_LOGO_URL = 'https://res.cloudinary.com/pyjyrmry/image/upload/q_100,f_auto,dpr_3.0/v1793352216/dungeons_hero_assets/dungeons_splash_logo.png';

export function BrandIntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'show' | 'exit' | 'done'>('show');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timerRefs.current.push(t);
      return t;
    };

    // Exactly 4 seconds display then smooth fade into website
    schedule(() => setPhase('exit'), 3500);
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
          width="240"
          height="160"
          fetchPriority="high"
          className="dungeons-splash-logo-img"
        />
        <p className="dungeons-splash-tagline">Within the Dungeons, Treasures Await</p>
      </div>
    </div>
  );
}
