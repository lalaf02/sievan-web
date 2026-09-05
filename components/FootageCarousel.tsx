'use client';

import { useEffect, useRef, useState } from 'react';
import type { Clip } from '@/lib/types';
import styles from './FootageCarousel.module.css';

type Slide = {
  id: string;
  clip: Clip;
  caption: string;
};

export function FootageCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!slides.length) return null;

  const previous = () => setIndex((current) => (current - 1 + slides.length) % slides.length);
  const next = () => setIndex((current) => (current + 1) % slides.length);
  const slide = slides[index];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    void video.play().catch(() => {
      // Muted autoplay is expected to succeed, but the poster remains a usable fallback.
    });
  }, [index]);

  return (
    <div className={styles.carousel} aria-label="Archival footage carousel">
      <div className={styles.stage}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.previous}`}
          onClick={previous}
          aria-label="Previous video"
        >
          ←
        </button>

        <figure className={styles.slide} aria-live="polite">
          <div className={styles.videoFrame}>
            <video
              ref={videoRef}
              key={slide.clip.src}
              className={styles.video}
              src={slide.clip.src}
              poster={slide.clip.poster}
              width={slide.clip.width}
              height={slide.clip.height}
              aria-label={slide.clip.alt}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          </div>
          <figcaption className={styles.caption}>{slide.caption}</figcaption>
        </figure>

        <button
          type="button"
          className={`${styles.arrow} ${styles.next}`}
          onClick={next}
          aria-label="Next video"
        >
          →
        </button>
      </div>

      <p className={styles.counter} aria-hidden="true">
        {index + 1} / {slides.length}
      </p>
    </div>
  );
}
