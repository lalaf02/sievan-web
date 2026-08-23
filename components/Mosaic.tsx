/**
 * The mosaic grid and its tiles. See Mosaic.module.css for the shape of the idea:
 * a tile is a column of media, and height comes from what is in it.
 */
import type { CSSProperties, ReactNode } from 'react';
import styles from './Mosaic.module.css';

export const COLUMNS = 12;

export function Mosaic({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[styles.mosaic, className].filter(Boolean).join(' ')}>{children}</div>;
}

export function Tile({
  col, as: As = 'div', className, style, fill, children,
}: {
  /** Columns to span, of twelve. */
  col: number;
  as?: 'div' | 'section' | 'figure' | 'nav' | 'article';
  className?: string;
  style?: CSSProperties;
  /** Stretch to the tallest tile in the row. For panels, not for media. */
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <As
      className={[styles.tile, fill && styles.fill, className].filter(Boolean).join(' ')}
      style={{ gridColumn: `span ${col}`, ...style }}
    >
      {children}
    </As>
  );
}

export const mosaicStyles = styles;
