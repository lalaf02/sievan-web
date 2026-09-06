'use client';

import { useState } from 'react';
import type { Clip } from '@/lib/types';
import { Footage } from './Footage';
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
  const slide = slides[index % slides.length];

  return (
    <div className={styles.carousel} aria-label="Archival footage carousel">
      <div className={styles.stage}>
        <button
          type="button"
          className={styles.arrow}
          onClick={previous}
          aria-label="Previous video"
        >
          ←
        </button>

        <figure className={styles.slide} aria-live="polite">
          <div className={styles.videoFrame}>
            <Footage
              key={slide.clip.src}
              className={styles.video}
              clip={slide.clip}
              priority
            />
          </div>
          <figcaption className={styles.caption}>{slide.caption}</figcaption>
        </figure>

        <button
          type="button"
          className={styles.arrow}
          onClick={next}
          aria-label="Next video"
        >
          →
        </button>
      </div>

      <p className={styles.counter} aria-hidden="true">
        {(index % slides.length) + 1} / {slides.length}
      </p>
      <noscript>
        <p>Open the surviving footage:</p>
        <ul>{slides.map((item) => (
          <li key={item.id}><a href={item.clip.src}>{item.caption}</a></li>
        ))}</ul>
      </noscript>
    </div>
  );
}
