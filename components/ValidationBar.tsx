import styles from './ValidationBar.module.css';

interface ValidationItem {
  label: string;
  value: string | number;
}

interface ValidationBarProps {
  items?: ValidationItem[];
}

/**
 * Quick credibility hits displayed horizontally.
 *
 * Default shows the strongest validation points: MoMA, museum count,
 * Greenberg, major critics.
 */
export function ValidationBar({ items }: ValidationBarProps) {
  const defaultItems: ValidationItem[] = [
    { label: 'MoMA', value: 'Collection' },
    { label: 'Museums', value: '13' },
    { label: 'Greenberg', value: 'Endorsed' },
    { label: 'Critics', value: 'Ashton, Kramer' },
  ];

  const displayItems = items ?? defaultItems;

  return (
    <div className={styles.bar}>
      {displayItems.map((item, i) => (
        <div key={i} className={styles.item}>
          <span className={styles.value}>{item.value}</span>
          <span className={styles.label}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact inline validation for use in prose.
 */
export function ValidationInline() {
  return (
    <span className={styles.inline}>
      MoMA | Hirshhorn | Brooklyn Museum | 10 more institutions
    </span>
  );
}
