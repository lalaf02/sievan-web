'use client';

import { useEffect, useRef } from 'react';
import type { Clip } from '@/lib/types';

/** Silent footage remains pausable and starts as a poster without JavaScript. */
export function Footage({ clip, className, priority = false }: {
  clip: Clip;
  className?: string;
  priority?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      if (motion.matches) video.pause();
      else void video.play().catch(() => { /* The poster remains the fallback. */ });
    };
    sync();
    motion.addEventListener('change', sync);
    return () => motion.removeEventListener('change', sync);
  }, [clip.src]);

  return (
    <video
      ref={ref}
      className={className}
      src={clip.src}
      poster={clip.poster}
      width={clip.width}
      height={clip.height}
      aria-label={clip.alt}
      controls
      muted
      loop
      playsInline
      preload={priority ? 'metadata' : 'none'}
    />
  );
}
