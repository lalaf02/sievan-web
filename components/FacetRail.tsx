'use client';

import { NOT_STATED } from '@/lib/facets';
import styles from './FacetRail.module.css';

/**
 * One facet block.
 *
 * Defined at module scope, not inside a browser component: a component created during
 * render is a new type on every render, so React unmounts and remounts the whole
 * subtree and any focus inside it is lost. `react-hooks/static-components` catches
 * this, and it is the reason the rule is not treated as cosmetic here.
 *
 * Hidden below two options, because a facet offering one choice filters nothing.
 */
export function CheckList({
  label, options, selected, param, onToggle, format,
}: {
  label: string;
  options: [string, number][];
  selected: Set<string>;
  param: string;
  onToggle: (param: string, value: string) => void;
  format?: (v: string) => string;
}) {
  if (options.length < 2) return null;
  return (
    <>
      <p className={styles.label}>{label}</p>
      <ul className={styles.checkList}>
        {options.map(([v, n]) => (
          <li key={v}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={selected.has(v)}
                onChange={() => onToggle(param, v)}
              />
              {/* Silence is set apart from a stated value rather than dressed as one. */}
              <span className={v === NOT_STATED ? styles.quiet : undefined}>
                {format ? format(v) : v}
              </span>
              <span className={styles.count}>{n}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

export function RailSearch({
  id, label, placeholder, value, onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input
        id={id}
        type="search"
        className={styles.search}
        defaultValue={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

export function ClearFilters({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" className={styles.clear} onClick={onClear}>
      Clear all filters
    </button>
  );
}
