import type { Clip } from '@/lib/types';

/** Silent archival footage: always starts as a poster and plays only on request. */
export function Footage({ clip, className, priority = false }: {
  clip: Clip;
  className?: string;
  priority?: boolean;
}) {
  return (
    <video
      className={className}
      src={clip.src}
      poster={clip.poster}
      width={clip.width}
      height={clip.height}
      aria-label={clip.alt}
      controls
      playsInline
      preload={priority ? 'metadata' : 'none'}
    />
  );
}
