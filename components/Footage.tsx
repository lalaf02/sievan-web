import type { Clip } from '@/lib/types';

/** Silent archival footage: always starts as a poster and plays only on request. */
export function Footage({
  clip, className, priority = false, autoPlay = false, loop = false, controls = true,
}: {
  clip: Clip;
  className?: string;
  priority?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
}) {
  return (
    <video
      className={className}
      src={clip.src}
      poster={clip.poster}
      width={clip.width}
      height={clip.height}
      aria-label={clip.alt}
      autoPlay={autoPlay}
      muted={autoPlay}
      loop={loop}
      controls={controls}
      playsInline
      preload={priority ? 'metadata' : 'none'}
    />
  );
}
