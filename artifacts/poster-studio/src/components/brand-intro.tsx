import { useEffect, useState, useRef } from 'react';

// 4K Ultra HD crisp logo with text (matching exact uploaded user reference)
const SPLASH_LOGO_URL = '/assets/dungeons-splash-4k.png';

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
          alt="DUNGEONS - Within the Dungeons, Treasures Await"
          width="318"
          height="224"
          fetchPriority="high"
          loading="eager"
          className="dungeons-splash-logo-img"
        />
      </div>
    </div>
  );
}
