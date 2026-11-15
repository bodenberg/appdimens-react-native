/**
 * Opt-in `Number.prototype` extensions for custom strategies, so values read like the
 * Android API: `(16).cdp`, `(14).csp` (default strategy) and `(16).cdpWith(brand)`.
 *
 *   import 'appdimens-react-native/custom/number';
 */
import {installNumberExtensions} from '../core/numberExtensions';
import {cdp, cdpPx, csp, cspPx, pickCustomStrategy} from './index';
import type {CustomScalingStrategy} from './index';

declare global {
  interface Number {
    /** Custom · default strategy · dp */
    readonly cdp: number;
    /** Custom · default strategy · physical px */
    readonly cdpPx: number;
    /** Custom · default strategy · text fontSize */
    readonly csp: number;
    /** Custom · default strategy · text physical px */
    readonly cspPx: number;
    /** Custom · explicit strategy · dp: `(16).cdpWith(brand)` */
    cdpWith(strategy: CustomScalingStrategy | string): number;
    /** Custom · explicit strategy · text fontSize: `(14).cspWith('brand')` */
    cspWith(strategy: CustomScalingStrategy | string): number;
  }
}

installNumberExtensions({
  cdp: v => cdp(v),
  cdpPx: v => cdpPx(v),
  csp: v => csp(v),
  cspPx: v => cspPx(v),
});

const proto = Number.prototype as unknown as Record<string, unknown>;
if (!Object.prototype.hasOwnProperty.call(proto, 'cdpWith')) {
  Object.defineProperty(proto, 'cdpWith', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function (this: number, strategy: CustomScalingStrategy | string) {
      return pickCustomStrategy(strategy).dp(Number(this));
    },
  });
  Object.defineProperty(proto, 'cspWith', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function (this: number, strategy: CustomScalingStrategy | string) {
      return pickCustomStrategy(strategy).sp(Number(this));
    },
  });
}

export {};
