'use client';

import { Children, isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import styles from './LifeChapters.module.css';

export function LifeChapter(props: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return <section id={props.id} aria-labelledby={`${props.id}-tab`} className={styles.chapter}>{props.children}</section>;
}

export function LifeChapters({
  children, label = 'Biography chapters',
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const chapters = useMemo(() => Children.toArray(children).filter(isValidElement<{
    id: string; title: string;
  }>), [children]);
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    root.current?.setAttribute('data-enhanced', 'true');
    const hash = window.location.hash.slice(1);
    const index = chapters.findIndex((chapter) => chapter.props.id === hash);
    const timer = window.setTimeout(() => { if (index >= 0) setActive(index); }, 0);
    return () => window.clearTimeout(timer);
  }, [chapters]);

  const select = (index: number, updateHash = true) => {
    setActive(index);
    if (updateHash) history.replaceState(null, '', `#${chapters[index].props.id}`);
  };

  return (
    <div ref={root} className={styles.root}>
      <div className={styles.tabs} role="tablist" aria-label={label}>
        {chapters.map((chapter, index) => (
          <button
            key={chapter.props.id}
            id={`${chapter.props.id}-tab`}
            ref={(node) => { tabs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls={chapter.props.id}
            tabIndex={active === index ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 0
                : event.key === 'End' ? chapters.length - 1
                  : (active + (event.key === 'ArrowRight' ? 1 : -1) + chapters.length) % chapters.length;
              select(next);
              tabs.current[next]?.focus();
            }}
          >
            <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
            {chapter.props.title}
          </button>
        ))}
      </div>
      <div className={styles.panels}>
        {chapters.map((chapter, index) => (
          <div
            key={chapter.props.id}
            className={styles.panel}
            data-active={active === index}
            role="tabpanel"
            aria-labelledby={`${chapter.props.id}-tab`}
          >{chapter}</div>
        ))}
      </div>
    </div>
  );
}
