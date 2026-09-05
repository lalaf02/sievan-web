'use client';

import { useState } from 'react';
import { ClipTile } from '@/components/MediaTile';
import type { Clip } from '@/lib/types';
import styles from './FootageCarousel.module.css';

type Slide = {
  id: string;
  clip: Clip;
  caption: string;
};

export function FootageCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);

  if (!slides.length) return null;

  const previous = () => setIndex((current) => (current - 1 + slides.length) % slides.length);
  const next = () => setIndex((current) => (current + 1) % slides.length);
  const slide = slides[index];

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

        <div className={styles.slide} aria-live="polite">
          <ClipTile
            key={slide.id}
            clip={slide.clip}
            aspect="3 / 2"
            priority
            caption={slide.caption}
          />
        </div>

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
