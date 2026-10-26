import { useEffect, useState, useRef } from 'react';

export function BrandIntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'curtain' | 'logo-in' | 'hold' | 'tagline' | 'exit' | 'done'>('curtain');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timerRefs.current.push(t);
      return t;
    };
    // Cinematic timeline (~7 s total)
    schedule(() => setPhase('logo-in'),  600);
    schedule(() => setPhase('hold'),     2200);
    schedule(() => setPhase('tagline'),  3600);
    schedule(() => setPhase('exit'),     5400);
    schedule(() => { setPhase('done'); onComplete(); }, 7200);
    return () => timerRefs.current.forEach(clearTimeout);
  }, [onComplete]);

  if (phase === 'done') return null;

  const logoVisible = phase === 'logo-in' || phase === 'hold' || phase === 'tagline';
  const ringVisible = phase === 'hold' || phase === 'tagline';
  const taglineVisible = phase === 'tagline';

  return (
    <div className={`brand-intro-overlay ${phase}`} aria-hidden="true">
      <div className="brand-intro-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="brand-intro-particle" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="brand-intro-bar brand-intro-bar--top" />
      <div className="brand-intro-bar brand-intro-bar--bottom" />
      <div className={`brand-intro-ring ${ringVisible ? 'visible' : ''}`} />
      <div className="brand-intro-center">
        <div className={`brand-intro-logo ${logoVisible ? 'visible' : ''}`}>
          <img src="/assets/dungeons-castle-white.png" alt="Dungeons Castle" className="brand-intro-castle" />
        </div>
        <div className={`brand-intro-name ${logoVisible ? 'visible' : ''}`}>
          {'DUNGEONS'.split('').map((ch, i) => (
            <span key={i} className="brand-intro-letter" style={{ '--d': `${i * 60}ms` } as React.CSSProperties}>
              {ch}
            </span>
          ))}
        </div>
        <div className={`brand-intro-tagline ${taglineVisible ? 'visible' : ''}`}>
          Posters &amp; Wall Art&nbsp;&nbsp;·&nbsp;&nbsp;Premium Quality
        </div>
      </div>
    </div>
  );
}

