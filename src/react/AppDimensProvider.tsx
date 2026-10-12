/**
 * `AppDimensProvider` — port of the Compose provider.
 *
 * Optional. It exposes the snapshot through context and lets you declare overrides that the
 * platform cannot detect (fold/flip states from a hinge library, car/watch modes, forced
 * multi-window). Overrides are global (like Android `DimenCache`), so use a single provider at
 * the root of the app.
 */
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import {DimenCache} from '../core/DimenCache';
import type {DimenMetrics, DimenMetricsInput} from '../core/DimenMetrics';
import type {UiModeType} from '../core/types';
import {useDimenMetrics} from './hooks';

const useIsomorphicLayoutEffect =
  typeof (globalThis as {window?: unknown}).window === 'undefined' ? useEffect : useLayoutEffect;

const DimenMetricsContext = createContext<DimenMetrics | null>(null);

export interface AppDimensProviderProps {
  children?: ReactNode;
  /** Forces the UI mode (e.g. `UiModeType.FOLD_OPEN`). `undefined` = automatic detection. */
  uiModeType?: UiModeType;
  /** Forces the multi-window state. `undefined` = automatic heuristic. */
  multiWindowMode?: boolean;
  /** Overrides raw metrics (Storybook, tests, embedded windows). */
  metricsOverride?: Partial<DimenMetricsInput>;
}

/** Provider that applied the active overrides (the most recently rendered one wins). */
let owner: object | null = null;

function sameOverride(a?: Partial<DimenMetricsInput>, b?: Partial<DimenMetricsInput>): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a) as Array<keyof DimenMetricsInput>;
  return ka.length === Object.keys(b).length && ka.every(k => a[k] === b[k]);
}

export function AppDimensProvider({
  children,
  uiModeType,
  multiWindowMode,
  metricsOverride,
}: AppDimensProviderProps) {
  // Apply overrides synchronously and silently so this render already uses them; other
  // subscribers are notified after commit (no cross-component updates during render).
  const applied = useRef<{ui?: UiModeType; mw?: boolean; mo?: Partial<DimenMetricsInput>} | null>(
    null,
  );
  const token = useRef({}).current;
  const prev = applied.current;
  if (
    owner !== token ||
    !prev ||
    prev.ui !== uiModeType ||
    prev.mw !== multiWindowMode ||
    !sameOverride(prev.mo, metricsOverride)
  ) {
    DimenCache.configureSilently({
      uiModeType: uiModeType ?? null,
      multiWindowMode: multiWindowMode ?? null,
      metricsOverride: metricsOverride ?? null,
    });
    applied.current = {ui: uiModeType, mw: multiWindowMode, mo: metricsOverride};
    owner = token;
  }

  useIsomorphicLayoutEffect(() => {
    DimenCache.flush();
  });

  useEffect(
    () => () => {
      // Only the provider that owns the overrides may clear them.
      if (owner !== token) return;
      owner = null;
      DimenCache.configureSilently({
        uiModeType: null,
        multiWindowMode: null,
        metricsOverride: null,
      });
      DimenCache.flush();
    },
    [token],
  );

  const metrics = useDimenMetrics();
  return <DimenMetricsContext.Provider value={metrics}>{children}</DimenMetricsContext.Provider>;
}

/**
 * Snapshot from the nearest {@link AppDimensProvider} (Compose `LocalDimenMetrics.current`).
 * Falls back to the global snapshot (with subscription) when there is no provider.
 */
export function useLocalDimenMetrics(): DimenMetrics {
  const fromContext = useContext(DimenMetricsContext);
  const global = useDimenMetrics();
  return fromContext ?? global;
}
