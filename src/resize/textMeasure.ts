/**
 * Synchronous text-block estimator used by the auto-resize helpers.
 *
 * React Native has no synchronous text measurer in JS, so the default measurer estimates glyph
 * advances per character class and performs a greedy word wrap. It is deterministic, allocation
 * light and conservative (it slightly over-estimates widths so text does not clip). For exact
 * results pass your own `measure` function (e.g. backed by a native measurer).
 */

/** Result of measuring a text block. */
export interface TextBlockSize {
  /** Widest line in dp. */
  width: number;
  /** Total height in dp. */
  height: number;
  /** Number of laid-out lines. */
  lines: number;
}

/** Options for the built-in estimator. */
export interface TextEstimateOptions {
  /** Line height as a multiple of the font size (default 1.2). */
  lineHeightMultiplier?: number;
  /** Absolute line height in dp (overrides `lineHeightMultiplier`). */
  lineHeight?: number;
  /** Extra spacing per character in dp (`letterSpacing`). */
  letterSpacing?: number;
  /** Multiplies every glyph advance (e.g. 1.08 for bold fonts). Default 1. */
  widthFactor?: number;
}

/** A pluggable measurer: size of `text` rendered at `fontSize` (dp) wrapped at `maxWidth`. */
export type TextMeasurer = (
  text: string,
  fontSize: number,
  maxWidth: number,
  options: TextEstimateOptions,
) => TextBlockSize;

/** Advance of one UTF-16 code unit in ems. */
function advanceEm(code: number): number {
  if (code === 32) return 0.28; // space
  if (code >= 0x2e80) return 1.0; // CJK, full-width, emoji (surrogates count twice × 0.5 below)
  if (code >= 0xd800 && code <= 0xdfff) return 0.5;
  if (code >= 65 && code <= 90) {
    // uppercase
    return code === 73 ? 0.3 : code === 77 || code === 87 ? 0.85 : 0.66;
  }
  if (code >= 48 && code <= 57) return 0.56; // digits
  switch (code) {
    case 105: // i
    case 106: // j
    case 108: // l
    case 46: // .
    case 44: // ,
    case 39: // '
    case 33: // !
    case 124: // |
    case 58: // :
    case 59: // ;
      return 0.28;
    case 102: // f
    case 116: // t
    case 114: // r
      return 0.36;
    case 109: // m
    case 119: // w
      return 0.84;
    default:
      return 0.55;
  }
}

/** Estimated width (dp) of a single-line string. */
export function estimateTextWidth(
  text: string,
  fontSize: number,
  options: TextEstimateOptions = {},
): number {
  const factor = options.widthFactor ?? 1;
  const spacing = options.letterSpacing ?? 0;
  let em = 0;
  for (let i = 0; i < text.length; i++) em += advanceEm(text.charCodeAt(i));
  return em * fontSize * factor + spacing * text.length;
}

/** Default measurer: greedy word wrap over {@link estimateTextWidth}. */
export const estimateTextBlock: TextMeasurer = (text, fontSize, maxWidth, options) => {
  const lineHeight = options.lineHeight ?? fontSize * (options.lineHeightMultiplier ?? 1.2);
  const spaceW = estimateTextWidth(' ', fontSize, options);
  let lines = 0;
  let widest = 0;
  const paragraphs = text.split('\n');
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let lineW = 0;
    let lineHasContent = false;
    lines++;
    for (const word of words) {
      let w = estimateTextWidth(word, fontSize, options);
      const needed = lineHasContent ? lineW + spaceW + w : w;
      if (needed <= maxWidth || !lineHasContent) {
        if (!lineHasContent && w > maxWidth && maxWidth > 0) {
          // Hard-break a word wider than the line.
          while (w > maxWidth) {
            widest = Math.max(widest, maxWidth);
            w -= maxWidth;
            lines++;
          }
          lineW = w;
        } else {
          lineW = needed;
        }
        lineHasContent = true;
      } else {
        widest = Math.max(widest, lineW);
        lines++;
        lineW = w;
        while (lineW > maxWidth && maxWidth > 0) {
          widest = Math.max(widest, maxWidth);
          lineW -= maxWidth;
          lines++;
        }
      }
    }
    widest = Math.max(widest, lineW);
  }
  return {width: widest, height: lines * lineHeight, lines};
};
