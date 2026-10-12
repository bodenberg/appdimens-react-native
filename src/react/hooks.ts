/**
 * React hooks — the counterpart of Compose `LocalDimenMetrics` / `LocalConfiguration`.
 *
 * Scaling functions (`sdp`, `ssp`, …) are plain functions that read the current snapshot, so
 * a component re-renders with new values only when something it subscribes to changes. Call
 * {@link useDimenMetrics} (or use the style helpers) in components that compute dimensions
 * during render so they update on rotation, resize, split-screen and font-scale changes.
 */
import * as React from 'react';
import {DimenCache, store} from '../core/DimenCache';
import type {DimenMetrics} from '../core/DimenMetrics';

const subscribe = (cb: () => void) => DimenCache.subscribe(cb);
const getSnapshot = () => store.m;

type UseSES = <T>(s: (cb: () => void) => () => void, g: () => T, gs?: () => T) => T;
const useSES = (React as unknown as {useSyncExternalStore?: UseSES}).useSyncExternalStore;

/** @internal Fallback for React < 18 (exported for tests). */
export function useDimenMetricsLegacy(): DimenMetrics {
  const [m, setM] = React.useState(store.m);
  React.useEffect(() => {
    if (store.m !== m) setM(store.m);
    return DimenCache.subscribe(setM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return m;
}

function useDimenMetricsModern(): DimenMetrics {
  return (useSES as UseSES)(subscribe, getSnapshot, getSnapshot);
}

/**
 * Current window snapshot; re-renders the component whenever the window changes
 * (rotation, resize, split-screen, font scale, UI-mode override).
 */
export const useDimenMetrics: () => DimenMetrics = useSES
  ? useDimenMetricsModern
  : useDimenMetricsLegacy;

/** Alias of {@link useDimenMetrics}. */
export const useAppDimens = useDimenMetrics;
