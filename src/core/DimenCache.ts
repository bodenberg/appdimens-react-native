/**
 * Global metrics store — port of Android `DimenCache` (snapshot-partitioned since 3.1.8).
 *
 * Holds the current immutable {@link DimenMetrics} snapshot, keeps it in sync through an
 * event-driven watcher (`Dimensions` 'change' + `AppState` 'active' for font-scale changes) and
 * notifies subscribers (React hooks) only when the window really changes.
 */
import {AppState, Dimensions, PixelRatio, Platform} from 'react-native';
import {DimenMetrics, type DimenMetricsInput} from './DimenMetrics';
import {UiModeType} from './types';

/** @internal Mutable holder read by every kernel (one property load on the hot path). */
export const store: {m: DimenMetrics} = {m: DimenMetrics.DEFAULT};

type Listener = (metrics: DimenMetrics) => void;

const listeners = new Set<Listener>();
let uiModeOverride: UiModeType | null = null;
let multiWindowOverride: boolean | null = null;
let manualInput: Partial<DimenMetricsInput> | null = null;
let watching = false;
let subscriptions: Array<{remove: () => void} | undefined> = [];

function detectUiModeType(): UiModeType {
  const p = Platform as unknown as {isTV?: boolean; isVision?: boolean; OS?: string};
  if (p.isTV) return UiModeType.TELEVISION;
  if (p.isVision || p.OS === 'visionos') return UiModeType.VR_HEADSET;
  return UiModeType.NORMAL;
}

function safeGet(dim: 'window' | 'screen'): {
  width: number;
  height: number;
  scale?: number;
  fontScale?: number;
} {
  try {
    const v = Dimensions.get(dim);
    if (v && typeof v.width === 'number') return v;
  } catch {
    // Dimensions unavailable (tests / SSR) — fall through to the reference window.
  }
  return {width: 300, height: 533, scale: 1, fontScale: 1};
}

function readPlatformInput(): DimenMetricsInput {
  const win = safeGet('window');
  const scr = safeGet('screen');
  let density = win.scale;
  let fontScale = win.fontScale;
  try {
    density = PixelRatio.get() || density;
    fontScale = PixelRatio.getFontScale() || fontScale;
  } catch {
    // keep Dimensions values
  }
  return {
    width: win.width,
    height: win.height,
    screenWidth: scr.width,
    screenHeight: scr.height,
    density,
    fontScale,
  };
}

function buildInput(): DimenMetricsInput {
  const input: DimenMetricsInput = {...readPlatformInput(), ...(manualInput ?? {})};
  input.uiModeType = uiModeOverride ?? manualInput?.uiModeType ?? detectUiModeType();
  if (multiWindowOverride !== null) input.isInMultiWindowMode = multiWindowOverride;
  return input;
}

let notifiedVersion = 0;

function notify(): void {
  const next = store.m;
  if (next.version === notifiedVersion) return;
  notifiedVersion = next.version;
  listeners.forEach(l => {
    try {
      l(next);
    } catch (e) {
      // A faulty listener must never break the others.
      if (typeof console !== 'undefined') console.error('[appdimens] listener error', e);
    }
  });
}

/**
 * Re-reads the platform metrics; publishes a new snapshot only if something changed.
 * With `silent`, subscribers are notified later by {@link notify} (used during React render).
 */
function refresh(silent = false): DimenMetrics {
  const input = buildInput();
  if (store.m === DimenMetrics.DEFAULT || !store.m.equalsInput(input)) {
    store.m = new DimenMetrics(input);
  }
  if (!silent) notify();
  return store.m;
}

function startWatching(): void {
  if (watching) return;
  watching = true;
  try {
    subscriptions.push(Dimensions.addEventListener('change', () => refresh()));
  } catch {
    // no Dimensions events in this environment
  }
  try {
    subscriptions.push(
      AppState.addEventListener('change', state => {
        if (state === 'active') refresh();
      }),
    );
  } catch {
    // no AppState in this environment
  }
}

function stopWatching(): void {
  subscriptions.forEach(s => s?.remove?.());
  subscriptions = [];
  watching = false;
}

// Event-driven watcher (Android `ensureConfigWatcher`): installed once, at load.
refresh();
startWatching();

/**
 * Public cache / metrics API (same role as Android `DimenCache`).
 */
export const DimenCache = {
  /** Current immutable window snapshot. */
  get currentMetrics(): DimenMetrics {
    return store.m;
  },

  /** Version of the current snapshot — changes on every real window change. */
  get version(): number {
    return store.m.version;
  },

  /** Subscribes to snapshot changes. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Forces a re-read of the platform metrics (Android `invalidateOnConfigChange`). */
  refresh(): DimenMetrics {
    return refresh();
  },

  /** Compatibility alias of {@link DimenCache.refresh}. */
  invalidateOnConfigChange(): DimenMetrics {
    return refresh();
  },

  /**
   * Overrides the detected UI mode (e.g. `FOLD_OPEN` from a foldable/hinge library, `CAR`,
   * `WATCH`). Pass `null` to return to automatic detection.
   */
  setUiModeType(type: UiModeType | null): DimenMetrics {
    uiModeOverride = type;
    return refresh();
  },

  /** Forces the multi-window state (`null` = automatic display/window heuristic). */
  setMultiWindowMode(value: boolean | null): DimenMetrics {
    multiWindowOverride = value;
    return refresh();
  },

  /**
   * Overrides raw metrics (useful for tests, Storybook, web previews or embedded windows).
   * Pass `null` to go back to the platform values.
   */
  setMetricsOverride(input: Partial<DimenMetricsInput> | null): DimenMetrics {
    manualInput = input ? {...input} : null;
    return refresh();
  },

  /** Current UI mode (Android `DimenCache.getCachedUiModeType`). */
  getCachedUiModeType(): UiModeType {
    return store.m.uiModeType;
  },

  /** Starts the event-driven watcher (it starts automatically on import). */
  startWatching,

  /** Stops the watcher (e.g. in tests). Snapshots then only change through `refresh()`. */
  stopWatching,

  /**
   * @internal Applies provider overrides without notifying (safe during render);
   * call {@link DimenCache.flush} afterwards (in a layout effect).
   */
  configureSilently(o: {
    uiModeType: UiModeType | null;
    multiWindowMode: boolean | null;
    metricsOverride: Partial<DimenMetricsInput> | null;
  }): DimenMetrics {
    uiModeOverride = o.uiModeType;
    multiWindowOverride = o.multiWindowMode;
    manualInput = o.metricsOverride ? {...o.metricsOverride} : null;
    return refresh(true);
  },

  /** @internal Notifies subscribers of a snapshot published silently. */
  flush(): void {
    notify();
  },

  /** @internal Resets every override (tests). */
  reset(): DimenMetrics {
    uiModeOverride = null;
    multiWindowOverride = null;
    manualInput = null;
    return refresh();
  },
};
