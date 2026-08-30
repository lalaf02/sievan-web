import Link from 'next/link';
import styles from './Record.module.css';

/** Props for RecordHeader component */
export interface RecordHeaderProps {
  eyebrow?: string;
  title: string;
  backHref: string;
  backLabel: string;
  children?: React.ReactNode;
}

export function RecordHeader({
  eyebrow, title, backHref, backLabel, children,
}: RecordHeaderProps) {
  return (
    <header className={styles.header}>
      <Link href={backHref} className={styles.back}>← {backLabel}</Link>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function Facts({ children }: { children: React.ReactNode }) {
  return <dl className={styles.dl}>{children}</dl>;
}

/** Renders nothing when the value is absent, so records never show empty rows. */
export function Fact({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/**
 * The manifest text a record was parsed from, shown verbatim. Every parsed record
 * has one, so a reader can always check the derivation against the source.
 */
export function Verbatim({ label = 'As catalogued', text }: { label?: string; text: string }) {
  return (
    <div className={styles.verbatimBlock}>
      <p className={styles.verbatimLabel}>{label}</p>
      <div className="verbatim">{text}</div>
    </div>
  );
}

/** A gap in the archive, stated rather than hidden. */
export function Absent({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className={styles.absent}>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

/** An editorial caveat, carried from the record's own notes field. */
export function EditorialNote({
  label = 'Note', children,
}: { label?: string; children: React.ReactNode }) {
  return (
    <div className={styles.note}>
      <p className={styles.noteLabel}>{label}</p>
      <div style={{ marginBottom: 0 }}>{children}</div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export function RecordList({ children }: { children: React.ReactNode }) {
  return <ul className={styles.list}>{children}</ul>;
}
