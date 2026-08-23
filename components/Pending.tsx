import styles from './Pending.module.css';

/**
 * A stated gap, at section scale.
 *
 * The archive's smaller sibling `Absent` (components/Record.tsx) marks one missing
 * thing — a scan that was never made. This marks a whole category that is coming:
 * the catalogue of works, the scholarship, the exhibition histories.
 *
 * Deliberately not a skeleton. Grey blocks in the shape of content read as a page
 * still loading, and a reader who waits gets nothing; worse, on a site whose
 * argument rests on showing its evidence, a fake row is indistinguishable from a
 * real one at a glance. So this says what is missing, what will be here, and — where
 * a reader can actually help — how to get in touch.
 *
 * `fields` names the shape of a future record without inventing an instance of one:
 * a reader learns what the catalogue will tell them, and nothing has been asserted
 * about any particular painting.
 */
export function Pending({
  eyebrow = 'Not yet in the archive',
  title,
  children,
  fields,
  fieldsLabel = 'Each entry will carry',
  footer,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  fields?: { name: string; note: string }[];
  fieldsLabel?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className={styles.pending}>
      <div className={styles.body}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.prose}>{children}</div>
        {footer && <p className={styles.footer}>{footer}</p>}
      </div>

      {fields && fields.length > 0 && (
        <div className={styles.fields}>
          <p className={styles.fieldsLabel}>{fieldsLabel}</p>
          <dl className={styles.fieldList}>
            {fields.map((f) => (
              <div key={f.name} className={styles.field}>
                <dt>{f.name}</dt>
                <dd>{f.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

/**
 * The one-line version, for a slot inside an otherwise complete record — a fact
 * that has no value yet rather than a section that has no rows.
 */
export function PendingLine({ children }: { children: React.ReactNode }) {
  return <span className={styles.line}>{children}</span>;
}
