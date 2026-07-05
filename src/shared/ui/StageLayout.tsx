import { useEffect, useState, type PropsWithChildren } from 'react';
import type { ScoreboardResponse } from '../model/scoreboard';

export function StageLayout({ children, background, data }: PropsWithChildren<{ background: string; data: ScoreboardResponse }>) {
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
  useEffect(() => {
    const resize = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return <main className={`stage-viewport ${data.settings.transparentBackground ? 'is-transparent' : ''}`}>
    <section className="stage" style={{ backgroundImage: data.settings.transparentBackground ? 'none' : `url(${background})`, transform: `scale(${scale})` }}>
      {children}
    </section>
  </main>;
}

export function LoadingStage({ error = '' }: { error?: string }) {
  return <main className="loading-stage"><div className="loader" /><p>{error || 'Загрузка данных…'}</p></main>;
}
