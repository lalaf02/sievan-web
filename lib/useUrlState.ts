'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Filter state that lives in the URL query string.
 *
 * Why not `useSearchParams`: reading it during render forces the component to be
 * client-rendered, which would strip the browsable content (60 press rows, 24,000
 * words of transcript) out of the prerendered HTML and replace it with a spinner.
 * The site has to read without JavaScript.
 *
 * Why not `useState` + `useEffect`: calling setState in an effect triggers a
 * cascading render and React's linter rightly rejects it.
 *
 * `useSyncExternalStore` is the right tool: the URL *is* an external store. The
 * server snapshot is empty, so the unfiltered list prerenders; after hydration the
 * real query string takes over, and `history.replaceState` keeps a filtered view
 * shareable and citable.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

const subscribe = (fn: Listener) => {
  listeners.add(fn);
  window.addEventListener('popstate', fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('popstate', fn);
  };
};

const getSnapshot = () => window.location.search;
/** Empty on the server so the full, unfiltered list is what gets prerendered. */
const getServerSnapshot = () => '';

export function useUrlState() {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const update = useCallback((mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(window.location.search);
    mutate(next);
    const qs = next.toString();
    // replaceState does not fire popstate, so subscribers are notified directly.
    window.history.replaceState(window.history.state, '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    for (const fn of listeners) fn();
  }, []);

  const toggle = useCallback(
    (key: string, value: string) =>
      update((p) => {
        // Build new values list without mutating during iteration
        const have = p.getAll(key);
        const next = have.includes(value)
          ? have.filter((v) => v !== value)
          : [...have, value];
        // Clear and rebuild atomically
        p.delete(key);
        for (const v of next) p.append(key, v);
      }),
    [update],
  );

  const clear = useCallback(() => update((p) => {
    // Collect keys first to avoid mutation during iteration
    const keys = [...p.keys()];
    for (const key of keys) p.delete(key);
  }), [update]);

  return { params, update, toggle, clear };
}
