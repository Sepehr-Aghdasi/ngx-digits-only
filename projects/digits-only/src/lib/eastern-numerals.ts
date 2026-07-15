/**
 * eastern-numerals.ts
 *
 * A fully standalone, zero-dependency TypeScript utility that converts
 * Arabic-Indic and Persian/Farsi digit characters to their Western (ASCII)
 * equivalents.
 *
 * ─── Zero dependencies ────────────────────────────────────────────────────────
 *
 * This file has NO imports. Copy it into ANY TypeScript or JavaScript project
 * and use it immediately — Angular, React, Vue, Node.js, plain TS, or a browser
 * script. Nothing else is required.
 *
 * ─── Why this exists ──────────────────────────────────────────────────────────
 *
 * Arabic and Persian keyboards — and many mobile IMEs across the Middle East
 * and South Asia — produce digit characters from a DIFFERENT Unicode block
 * than the ASCII digits 0–9 most Western software expects:
 *
 *   Western / ASCII     0  1  2  3  4  5  6  7  8  9
 *   Code points         U+0030 ── U+0039
 *
 *   Arabic-Indic        ٠  ١  ٢  ٣  ٤  ٥  ٦  ٧  ٨  ٩
 *   Code points         U+0660 ── U+0669
 *
 *   Persian / Farsi     ۰  ۱  ۲  ۳  ۴  ۵  ۶  ۷  ۸  ۹
 *   Code points         U+06F0 ── U+06F9
 *
 * When a user types ١٢٣ on an Arabic keyboard the browser sends those exact
 * Unicode code points, NOT '123'. Without conversion:
 *   • /^\d$/ does NOT match them (it only matches U+0030–U+0039)
 *   • Number('١٢٣') returns NaN
 *   • parseInt('١٢٣', 10) returns NaN
 *
 * ─── Safety guarantee ─────────────────────────────────────────────────────────
 *
 * This conversion is completely conflict-free because the Arabic and Persian
 * digit Unicode blocks have ZERO overlap with:
 *   • ASCII digits      (U+0030–U+0039)
 *   • ASCII letters     (U+0041–U+007A)
 *   • ASCII punctuation (. , - + $ € % @ # etc.)
 *
 * Converting ٥ → '5' can NEVER accidentally transform a separator, currency
 * symbol, or letter into something else. The substitution is exact and
 * unambiguous.
 *
 * ─── What is NOT converted ────────────────────────────────────────────────────
 *
 * • Arabic letters ا ب ت ث …      — no Western equivalent, left as-is
 * • Arabic diacritics (harakat)    — no Western equivalent, left as-is
 * • Any character outside the two digit blocks described above
 *
 * ─── Exports ──────────────────────────────────────────────────────────────────
 *
 *   convertEasternDigits(input)   Main conversion — Eastern digits → 0-9
 *   hasEasternDigits(input)       Quick check — does the string contain any?
 *   getDigitScript(input)         Identify which script the digits are in
 *   EASTERN_DIGIT_MAP             Full lookup table (for testing / docs)
 *   EASTERN_NUMERAL_REGEX         The two RegExp patterns (for advanced use)
 *
 * ─── Quick usage ──────────────────────────────────────────────────────────────
 *
 *   import { convertEasternDigits } from './eastern-numerals';
 *
 *   convertEasternDigits('١٢٣٫٤٥')     // '123.45'
 *   convertEasternDigits('۶۷۸')        // '678'
 *   convertEasternDigits('price: ١٠٠') // 'price: 100'  (non-digits untouched)
 *   convertEasternDigits('123')         // '123'          (already Western)
 *   convertEasternDigits(null)          // ''
 */

// ─────────────────────────────────────────────────────────────────────────────
// Internal regex constants
// (Inline here so the file has zero dependencies and can be used anywhere.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Regex patterns used internally by this module.
 * Also exported so callers can use them directly if needed.
 *
 * These are the same patterns documented in digits-only.regex.ts entries
 * ARABIC_DIGITS, PERSIAN_DIGITS, ARABIC_DECIMAL_COMMA, ARABIC_THOUSANDS_SEPARATOR
 * but duplicated here so this file remains self-contained.
 */
export const EASTERN_NUMERAL_REGEX = {

  /**
   * Matches any Arabic-Indic digit character (U+0660 – U+0669).
   * These are the digits used on Arabic keyboards: ٠١٢٣٤٥٦٧٨٩
   * The g flag ensures ALL occurrences in a string are replaced, not just the first.
   */
  ARABIC_DIGITS: /[\u0660-\u0669]/g,

  /**
   * Matches any Persian / Extended Arabic-Indic digit (U+06F0 – U+06F9).
   * These are the digits used on Persian / Farsi keyboards: ۰۱۲۳۴۵۶۷۸۹
   * Note: a DIFFERENT Unicode block from Arabic even though they look similar.
   *   Arabic zero  ٠  =  U+0660
   *   Persian zero ۰  =  U+06F0  ← different!
   */
  PERSIAN_DIGITS: /[\u06F0-\u06F9]/g,

  /**
   * Matches the Arabic Decimal Separator ٫ (U+066B).
   * In Arabic locale this character plays the role of the Western period '.'
   * as a decimal point. We normalize it to '.' so parseFloat / Number work.
   */
  ARABIC_DECIMAL_COMMA: /\u066B/g,

  /**
   * Matches the Arabic Thousands Separator ٬ (U+066C).
   * In Arabic locale this character plays the role of the Western comma ','
   * as a digit-group separator. We strip it so it doesn't pollute the number.
   */
  ARABIC_THOUSANDS_SEPARATOR: /\u066C/g,

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Full Unicode character map (exported for testing and documentation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every Eastern digit character mapped to its Western ASCII equivalent.
 *
 * Key   = Eastern character (as it arrives from the keyboard / clipboard)
 * Value = Western ASCII character it should become
 *
 * This map is exported for:
 *   • Unit tests that want to iterate over every case
 *   • Documentation / debugging
 *   • Manual lookups without running a conversion
 */
export const EASTERN_DIGIT_MAP: Readonly<Record<string, string>> = {

  // ── Arabic-Indic digits (U+0660 – U+0669) ────────────────────────────────
  // Used in: Arabic, Urdu, Sindhi, and other Arabic-script languages
  '٠': '0',   // U+0660  Arabic-Indic digit zero
  '١': '1',   // U+0661  Arabic-Indic digit one
  '٢': '2',   // U+0662  Arabic-Indic digit two
  '٣': '3',   // U+0663  Arabic-Indic digit three
  '٤': '4',   // U+0664  Arabic-Indic digit four
  '٥': '5',   // U+0665  Arabic-Indic digit five
  '٦': '6',   // U+0666  Arabic-Indic digit six
  '٧': '7',   // U+0667  Arabic-Indic digit seven
  '٨': '8',   // U+0668  Arabic-Indic digit eight
  '٩': '9',   // U+0669  Arabic-Indic digit nine

  // ── Persian / Extended Arabic-Indic digits (U+06F0 – U+06F9) ─────────────
  // Used in: Persian (Farsi), Pashto, Kurdish, and related languages
  '۰': '0',   // U+06F0  Extended Arabic-Indic digit zero
  '۱': '1',   // U+06F1  Extended Arabic-Indic digit one
  '۲': '2',   // U+06F2  Extended Arabic-Indic digit two
  '۳': '3',   // U+06F3  Extended Arabic-Indic digit three
  '۴': '4',   // U+06F4  Extended Arabic-Indic digit four
  '۵': '5',   // U+06F5  Extended Arabic-Indic digit five
  '۶': '6',   // U+06F6  Extended Arabic-Indic digit six
  '۷': '7',   // U+06F7  Extended Arabic-Indic digit seven
  '۸': '8',   // U+06F8  Extended Arabic-Indic digit eight
  '۹': '9',   // U+06F9  Extended Arabic-Indic digit nine

  // ── Arabic punctuation normalized as part of number handling ─────────────
  '٫': '.',   // U+066B  Arabic Decimal Separator → Western decimal point
  '٬': '',    // U+066C  Arabic Thousands Separator → stripped (empty string)

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Core conversion function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert all Arabic-Indic and Persian digit characters in a string
 * to their Western ASCII equivalents (0–9).
 *
 * The function runs four passes in order:
 *   1. Strip Arabic thousands separator ٬ (U+066C)
 *   2. Convert Arabic decimal comma ٫ (U+066B) → '.'
 *   3. Convert Arabic-Indic digits ٠-٩ (U+0660–U+0669) → '0'-'9'
 *   4. Convert Persian digits ۰-۹ (U+06F0–U+06F9) → '0'-'9'
 *
 * The function is PURE — it never mutates its input and has no side effects.
 *
 * @param input  Any string, number, null, or undefined.
 *               Numbers are converted via String() first.
 *               null / undefined / '' all return ''.
 * @returns      A new string with every Eastern digit replaced by its Western
 *               equivalent. Non-digit characters are passed through unchanged.
 *
 * @example
 *   convertEasternDigits('١٢٣')           // '123'
 *   convertEasternDigits('۶۷۸')           // '678'
 *   convertEasternDigits('١٢٣٫٤٥')       // '123.45'   (decimal comma)
 *   convertEasternDigits('١٬٢٣٤')        // '1234'     (thousands sep stripped)
 *   convertEasternDigits('price: ٩٩')    // 'price: 99' (non-digits untouched)
 *   convertEasternDigits('123')           // '123'       (already Western)
 *   convertEasternDigits('')              // ''
 *   convertEasternDigits(null)            // ''
 *   convertEasternDigits(undefined)       // ''
 *   convertEasternDigits(42)              // '42'        (number input)
 */
export function convertEasternDigits(
  input: string | number | null | undefined,
): string {

  // ── Guard ─────────────────────────────────────────────────────────────────
  // Handle null, undefined, and empty-string early so the rest of the
  // function can assume it has a non-empty string to work with.
  if (input === null || input === undefined || input === '') {
    return '';
  }

  // Coerce numbers to strings so the function also works when called
  // directly on a numeric value (e.g. after a model value update).
  const text = typeof input === 'number' ? String(input) : input;

  return text

    // ── Step 1: Remove Arabic thousands separator ──────────────────────────
    //
    // ٬ (U+066C) looks like a comma but is a completely different code point.
    // It must be stripped FIRST — before digit conversion — so it cannot
    // accidentally become part of the number string.
    //
    //   '١٬٢٣٤'  →  '١٢٣٤'   (grouping character removed)
    .replace(EASTERN_NUMERAL_REGEX.ARABIC_THOUSANDS_SEPARATOR, '')

    // ── Step 2: Arabic decimal comma → Western decimal point ──────────────
    //
    // ٫ (U+066B) is the decimal separator in Arabic locale.
    // We convert it to '.' so parseFloat / Number can parse the result.
    //
    //   '١٢٫٥'  →  '١٢.٥'   (decimal comma replaced, digits still Arabic)
    .replace(EASTERN_NUMERAL_REGEX.ARABIC_DECIMAL_COMMA, '.')

    // ── Step 3: Arabic-Indic digits → Western digits ───────────────────────
    //
    // The conversion formula uses the Unicode offset of the Arabic zero (0x0660):
    //
    //   Example with '٥':
    //     '٥'.charCodeAt(0)       = 0x0665  (1637 decimal)
    //     0x0665 - 0x0660         = 5        (the digit's numeric value)
    //     5 + 0x30                = 53       (ASCII code of '5')
    //     String.fromCharCode(53) = '5'
    //
    //   '٠١٢٣٤٥٦٧٨٩'  →  '0123456789'
    .replace(EASTERN_NUMERAL_REGEX.ARABIC_DIGITS, (arabicChar: string) => {
      const ARABIC_ZERO_CODE_POINT  = 0x0660; // Unicode code point of Arabic ٠
      const WESTERN_ZERO_CODE_POINT = 0x0030; // Unicode code point of ASCII  0

      const digitValue = arabicChar.charCodeAt(0) - ARABIC_ZERO_CODE_POINT;
      return String.fromCharCode(digitValue + WESTERN_ZERO_CODE_POINT);
    })

    // ── Step 4: Persian digits → Western digits ────────────────────────────
    //
    // Identical math to step 3 but using the Persian zero offset (0x06F0).
    // Persian and Arabic digits look similar but are different code points —
    // both blocks need their own replacement pass.
    //
    //   '۰۱۲۳۴۵۶۷۸۹'  →  '0123456789'
    .replace(EASTERN_NUMERAL_REGEX.PERSIAN_DIGITS, (persianChar: string) => {
      const PERSIAN_ZERO_CODE_POINT = 0x06F0; // Unicode code point of Persian ۰
      const WESTERN_ZERO_CODE_POINT = 0x0030; // Unicode code point of ASCII  0

      const digitValue = persianChar.charCodeAt(0) - PERSIAN_ZERO_CODE_POINT;
      return String.fromCharCode(digitValue + WESTERN_ZERO_CODE_POINT);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the string contains at least one Arabic-Indic or
 * Persian digit character.
 *
 * Useful as a cheap pre-check before calling convertEasternDigits — if this
 * returns false the string is already all-Western and no conversion is needed.
 *
 * @param input  Any string to check.
 * @returns      true if any Eastern digit is present, false otherwise.
 *
 * @example
 *   hasEasternDigits('١٢٣')    // true   — Arabic
 *   hasEasternDigits('۴۵۶')   // true   — Persian
 *   hasEasternDigits('٥0')     // true   — mix of Arabic and Western
 *   hasEasternDigits('123')    // false  — already Western
 *   hasEasternDigits('hello')  // false  — no digits at all
 *   hasEasternDigits('')       // false
 */
export function hasEasternDigits(input: string): boolean {
  if (!input) return false;

  // We must reset lastIndex before using a /g regex with .test()
  // because stateful regex objects remember where they left off.
  // The simplest safe approach is to re-create a clean regex each time.
  return /[\u0660-\u0669\u06F0-\u06F9]/.test(input);
}

/**
 * Identify which numeral script(s) the string's digits are written in.
 * Returns one of four values so callers can branch on the exact script
 * rather than just knowing "something eastern is present".
 *
 * @param input  Any string to inspect.
 * @returns
 *   'western'  — only ASCII digits 0-9 found (or no digits at all)
 *   'arabic'   — only Arabic-Indic digits ٠-٩ found
 *   'persian'  — only Persian digits ۰-۹ found
 *   'mixed'    — both Eastern script(s) AND/OR Western digits found together
 *
 * @example
 *   getDigitScript('١٢٣')       // 'arabic'
 *   getDigitScript('۴۵۶')      // 'persian'
 *   getDigitScript('123')       // 'western'
 *   getDigitScript('١23')       // 'mixed'   (Arabic + Western)
 *   getDigitScript('١۴')        // 'mixed'   (Arabic + Persian)
 *   getDigitScript('hello')     // 'western' (no digits → treated as Western)
 */
export type DigitScript = 'western' | 'arabic' | 'persian' | 'mixed';

export function getDigitScript(input: string): DigitScript {
  if (!input) return 'western';

  const containsArabic  = /[\u0660-\u0669]/.test(input);
  const containsPersian = /[\u06F0-\u06F9]/.test(input);
  const containsWestern = /[0-9]/.test(input);

  // Mixed: more than one script present simultaneously
  const scriptCount = [containsArabic, containsPersian, containsWestern]
    .filter(Boolean).length;

  if (scriptCount > 1) return 'mixed';
  if (containsArabic)  return 'arabic';
  if (containsPersian) return 'persian';
  return 'western';
}

/**
 * Convert a string that may contain Eastern digits to a JavaScript number.
 * A convenience wrapper around convertEasternDigits + parseFloat.
 *
 * Returns NaN for strings that don't represent a valid number
 * (same contract as parseFloat / Number).
 *
 * @param input  A string possibly containing Eastern digits.
 * @returns      A JavaScript number, or NaN if parsing fails.
 *
 * @example
 *   toWesternNumber('١٢٣')       // 123
 *   toWesternNumber('١٢٣٫٤٥')   // 123.45
 *   toWesternNumber('۹٩')        // 99   (mixed Arabic + Persian → still works)
 *   toWesternNumber('abc')        // NaN
 *   toWesternNumber('')           // NaN
 */
export function toWesternNumber(input: string | null | undefined): number {
  const converted = convertEasternDigits(input);
  return parseFloat(converted);
}
