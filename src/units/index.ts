/**
 * Physical units — port of `appdimens-dynamic-units` (`DimenPhysicalUnits`).
 *
 * Converts real-world lengths (mm / cm / inch) to dp, px and sp. React Native does not expose
 * the physical display DPI, so conversions use the platform's logical density reference:
 * 160 dp per inch on Android (the definition of a dp), 163 pt per inch on iOS and 96 px per
 * inch on the web (CSS inch). Override it with {@link DimenPhysicalUnits.setDpPerInch} when you
 * know the real value (e.g. from a native module).
 */
import {Platform} from 'react-native';
import {store} from '../core/DimenCache';
import {UnitType} from '../core/types';

const MM_PER_INCH = 25.4;

function platformDpPerInch(): number {
  switch (Platform.OS) {
    case 'ios':
      return 163;
    case 'web':
      return 96;
    default:
      return 160;
  }
}

let dpPerInch = platformDpPerInch();

function toDpFromInch(inch: number): number {
  return inch * dpPerInch;
}
function toDpFromMm(mm: number): number {
  return (mm / MM_PER_INCH) * dpPerInch;
}
function toDpFromCm(cm: number): number {
  return toDpFromMm(cm * 10);
}

function toDpFromUnit(value: number, unitType: UnitType): number {
  const m = store.m;
  switch (unitType) {
    case UnitType.MM:
      return toDpFromMm(value);
    case UnitType.CM:
      return toDpFromCm(value);
    case UnitType.INCH:
      return toDpFromInch(value);
    case UnitType.SP:
      return value * m.fontScale;
    case UnitType.PX:
      return value / m.density;
    default:
      return value;
  }
}

export const DimenPhysicalUnits = {
  /** Logical dp per physical inch currently used by the conversions. */
  getDpPerInch(): number {
    return dpPerInch;
  },
  /** Overrides the dp-per-inch reference (pass `null` to restore the platform default). */
  setDpPerInch(value: number | null): void {
    if (value === null) {
      dpPerInch = platformDpPerInch();
      return;
    }
    if (!(value > 0) || !isFinite(value))
      throw new RangeError('dpPerInch must be a positive number');
    dpPerInch = value;
  },

  toDpFromMm,
  toDpFromCm,
  toDpFromInch,
  toPxFromMm: (mm: number): number => toDpFromMm(mm) * store.m.density,
  toPxFromCm: (cm: number): number => toDpFromCm(cm) * store.m.density,
  toPxFromInch: (inch: number): number => toDpFromInch(inch) * store.m.density,
  /** Font size (sp) whose rendered height equals `mm` (font scale compensated). */
  toSpFromMm: (mm: number): number => toDpFromMm(mm) / store.m.fontScale,
  toSpFromCm: (cm: number): number => toDpFromCm(cm) / store.m.fontScale,
  toSpFromInch: (inch: number): number => toDpFromInch(inch) / store.m.fontScale,

  /** Radius (dp) of a circle with the given diameter expressed in `unitType`. */
  radiusFromDiameter(diameter: number, unitType: UnitType): number {
    return toDpFromUnit(diameter, unitType) / 2;
  },
  /** Radius (dp) of a circle with the given circumference expressed in `unitType`. */
  radiusFromCircumference(circumference: number, unitType: UnitType): number {
    return toDpFromUnit(circumference, unitType) / (2 * Math.PI);
  },
  /** Converts any supported unit to dp. */
  toDp: toDpFromUnit,

  mmToCm: (mm: number): number => mm / 10,
  mmToInch: (mm: number): number => mm / MM_PER_INCH,
  cmToMm: (cm: number): number => cm * 10,
  cmToInch: (cm: number): number => cm / 2.54,
  inchToMm: (inch: number): number => inch * MM_PER_INCH,
  inchToCm: (inch: number): number => inch * 2.54,
};

/** `mm` millimetres in dp (Compose `Float.mm`). */
export const mm = (value: number): number => toDpFromMm(value);
/** `cm` centimetres in dp. */
export const cm = (value: number): number => toDpFromCm(value);
/** `inch` inches in dp. */
export const inch = (value: number): number => toDpFromInch(value);
/** Millimetres in px. */
export const mmPx = DimenPhysicalUnits.toPxFromMm;
/** Centimetres in px. */
export const cmPx = DimenPhysicalUnits.toPxFromCm;
/** Inches in px. */
export const inchPx = DimenPhysicalUnits.toPxFromInch;

export {UnitType};
