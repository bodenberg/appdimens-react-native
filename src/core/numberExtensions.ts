/**
 * Opt-in `Number.prototype` getters so values read like Kotlin extensions: `(16).sdp`.
 *
 * Installed only when an `…/number` entry point is imported. Getters are non-enumerable and
 * configurable, so they never show up in `for…in` / `Object.keys` and can be removed.
 */
import type {DimenFn} from './types';

const installed = new Set<string>();

/** Marks getters created by this library (any copy/version of it). */
const MARK = '__appdimens';

function isOurs(proto: object, name: string): boolean {
  const d = Object.getOwnPropertyDescriptor(proto, name);
  return (
    !!d &&
    typeof d.get === 'function' &&
    (d.get as unknown as Record<string, unknown>)[MARK] === true
  );
}

/** Defines a getter on `Number.prototype` for every kernel of `kernels`. */
export function installNumberExtensions(kernels: Readonly<Record<string, DimenFn>>): void {
  const proto = Number.prototype as unknown as Record<string, unknown>;
  for (const name of Object.keys(kernels)) {
    if (installed.has(name)) continue;
    const fn = kernels[name];
    if (Object.prototype.hasOwnProperty.call(proto, name) && !isOurs(proto, name)) {
      throw new Error(
        `[appdimens] Number.prototype.${name} already exists; refusing to override it`,
      );
    }
    // A getter from another copy of the library (duplicated install / CJS+ESM) is replaced.
    const get = function (this: number) {
      return fn(+this);
    };
    (get as unknown as Record<string, unknown>)[MARK] = true;
    Object.defineProperty(proto, name, {configurable: true, enumerable: false, get});
    installed.add(name);
  }
}

/** Removes every getter installed by {@link installNumberExtensions}. */
export function uninstallNumberExtensions(): void {
  const proto = Number.prototype as unknown as Record<string, unknown>;
  installed.forEach(name => {
    if (isOurs(proto, name)) delete proto[name];
  });
  installed.clear();
}
