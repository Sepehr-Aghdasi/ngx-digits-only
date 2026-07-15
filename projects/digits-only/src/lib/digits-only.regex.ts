/**
 * digits-only.regex.ts
 *
 * Every regular expression used by the digitsOnly directive lives here.
 * Each constant has a plain-English name, a detailed breakdown, and live examples
 * so you never have to decode cryptic patterns inside the directive itself.
 *
 * Import what you need:
 *   import { REGEX } from './digits-only.regex';
 *   REGEX.SINGLE_DIGIT.test('5')   // true
 */

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO READ REGEX ANATOMY
// ─────────────────────────────────────────────────────────────────────────────
//
//   /pattern/flags
//    │       │
//    │       └── modifiers:  g = global (find ALL matches, not just first)
//    │                       i = case-insensitive
//    │                       m = multiline
//    │
//    └── special characters:
//          ^      start of string (or line with m flag)
//          $      end of string   (or line with m flag)
//          .      any single character except newline
//          \d     any digit  [0-9]
//          \D     any NON-digit
//          \w     word character [a-zA-Z0-9_]
//          \s     whitespace
//          \B     NON-word boundary position
//          [abc]  character class – matches a, b, or c
//          [^abc] negated class  – matches anything EXCEPT a, b, c
//          (abc)  capture group
//          (?=x)  positive lookahead – "followed by x" (zero-width, no consume)
//          (?!x)  negative lookahead – "NOT followed by x"
//          {n}    exactly n repetitions
//          {n,}   n or more repetitions
//          +      one or more  (greedy)
//          *      zero or more (greedy)
//          ?      zero or one  (optional)
//          \.     escaped dot  – a literal '.' character
//          \\     escaped backslash – a literal '\'
//          \-     escaped hyphen inside [] – a literal '-'
//          $&     in replacement strings: the entire matched text

export const REGEX = {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. SINGLE_DIGIT
  //    Is this one keyboard character exactly a digit and nothing else?
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Pattern breakdown:
  //    ^   – anchor: string must START here
  //    \d  – one digit character (0, 1, 2 … 9)
  //    $   – anchor: string must END here
  //
  //  The ^ and $ together mean the whole string must be exactly one digit.
  //  Without them, /\d/ would match '5' inside 'abc5xyz' too.
  //
  //  Used in:  onKeyDown() — to decide if a pressed key is a digit
  //
  //  ✔ matches:    '0'  '5'  '9'
  //  ✖ no match:   'a'  '-'  '.'  'Enter'  '12'  ''
  //
  SINGLE_DIGIT: /^\d$/,

  // ──────────────────────────────────────────────────────────────────────────
  // 2. NON_DIGIT_CHARACTERS
  //    Find (and remove) every character that is NOT a digit.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Pattern breakdown:
  //    [^0-9]  – negated character class
  //               ^ inside []  = NOT
  //               0-9          = any digit
  //             → "any character that is not 0 through 9"
  //    g       – global flag: match ALL occurrences, not just the first
  //
  //  Used in:  onKeyDown (count digits), validate (count digits), onPaste
  //
  //  Purpose:  Calling .replace(NON_DIGIT_CHARACTERS, '') strips everything
  //            except digits so we can measure the pure digit length,
  //            ignoring separators, dots, minus signs, prefix/suffix.
  //
  //  Examples:
  //    '$1,234.56'.replace(REGEX.NON_DIGIT_CHARACTERS, '')  →  '123456'
  //    '-99_000'.replace(REGEX.NON_DIGIT_CHARACTERS, '')    →  '99000'
  //    '007'.replace(REGEX.NON_DIGIT_CHARACTERS, '')        →  '007'
  //
  NON_DIGIT_CHARACTERS: /[^0-9]/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ONLY_DIGITS_AND_MINUS
  //    Remove everything except digits and the minus sign.
  //    Used for integer-mode paste sanitization.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Pattern breakdown:
  //    [^0-9\-]  – negated class that keeps digits and the literal hyphen
  //                \-  = escaped hyphen (a bare '-' in the middle of [] is
  //                      treated as a range operator, e.g. [a-z];
  //                      escaping with \ makes it a literal minus character)
  //    g         – global
  //
  //  Used in:  sanitizePastedText() when decimalPlaces === 0
  //
  //  Examples (integers only, negatives allowed):
  //    '1,234.56'.replace(REGEX.ONLY_DIGITS_AND_MINUS, '')   →  '123456'
  //    '-99.9%'.replace(REGEX.ONLY_DIGITS_AND_MINUS, '')     →  '-999'
  //    '007'.replace(REGEX.ONLY_DIGITS_AND_MINUS, '')        →  '007'
  //
  ONLY_DIGITS_AND_MINUS: /[^0-9\-]/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ONLY_DIGITS_DOT_AND_MINUS
  //    Remove everything except digits, a decimal point, and the minus sign.
  //    Used for decimal-number paste sanitization.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Pattern breakdown:
  //    [^0-9.\-]  – negated class
  //                  .  inside [] is a literal dot (no escape needed inside [])
  //                  \- is the literal minus
  //    g          – global
  //
  //  Difference from ONLY_DIGITS_AND_MINUS:
  //    This one also KEEPS the dot '.' so decimal numbers like '12.5' survive.
  //
  //  Used in:  sanitizePastedText() when decimalPlaces > 0
  //
  //  Examples:
  //    '$-1,234.56 USD'.replace(REGEX.ONLY_DIGITS_DOT_AND_MINUS, '')  →  '-1234.56'
  //    '€ 99.9%'.replace(REGEX.ONLY_DIGITS_DOT_AND_MINUS, '')         →  '99.9'
  //    'abc123def'.replace(REGEX.ONLY_DIGITS_DOT_AND_MINUS, '')       →  '123'
  //
  ONLY_DIGITS_DOT_AND_MINUS: /[^0-9.\-]/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 5. ONLY_DIGITS
  //    Remove everything except bare digits.
  //    Used for string-mode (identifiers like card numbers) where dots and
  //    minus signs are also illegal.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Pattern breakdown:
  //    [^0-9]  – keep only digit characters
  //    g       – global
  //
  //  Used in:  sanitizePastedText() in string / pattern mode,
  //            onPaste() in pattern mode,
  //            _applyPattern() to extract digit string before formatting
  //
  //  Examples:
  //    '4111-1111-1111-1111'.replace(REGEX.ONLY_DIGITS, '')  →  '4111111111111111'
  //    '(555) 867-5309'.replace(REGEX.ONLY_DIGITS, '')       →  '5558675309'
  //    '01/01/1990'.replace(REGEX.ONLY_DIGITS, '')           →  '01011990'
  //
  ONLY_DIGITS: /[^0-9]/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 6. ALL_DOTS
  //    Remove every dot/period from a string.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Pattern breakdown:
  //    \.  – escaped dot.
  //          In regex, a bare '.' means "any character except newline".
  //          The backslash \ escapes it to mean a LITERAL period character.
  //          Without the backslash, /./g would erase EVERY character.
  //    g   – global: remove all dots, not just the first
  //
  //  Used in:  onInput() and onPaste() when decimalPlaces === 0 or pattern is set.
  //            If integers are expected, any dot that slips through (e.g. from paste)
  //            must be stripped.
  //
  //  Examples:
  //    '12.34'.replace(REGEX.ALL_DOTS, '')   →  '1234'
  //    '1.2.3'.replace(REGEX.ALL_DOTS, '')   →  '123'
  //    '100'.replace(REGEX.ALL_DOTS, '')     →  '100'   (no dot, unchanged)
  //
  ALL_DOTS: /\./g,

  // ──────────────────────────────────────────────────────────────────────────
  // 7. ALL_MINUS_SIGNS
  //    Remove every minus / hyphen character from a string.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Pattern breakdown:
  //    -   – a literal hyphen/minus character
  //          (safe outside of a character class [] without escaping)
  //    g   – global
  //
  //  Used in:  sanitizePastedText() to strip minus signs when allowNegative is false
  //            or when outputType is 'string' (identifiers can't be negative).
  //
  //  Examples:
  //    '-99'.replace(REGEX.ALL_MINUS_SIGNS, '')      →  '99'
  //    '1-2-3'.replace(REGEX.ALL_MINUS_SIGNS, '')    →  '123'
  //
  ALL_MINUS_SIGNS: /-/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 8. THOUSANDS_SEPARATOR_POSITIONS
  //    Find every position in the INTEGER PART of a number where a thousands
  //    separator (comma, dot, space, underscore) should be inserted.
  //    This is the most sophisticated regex in the codebase.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Full pattern:  /\B(?=(\d{3})+(?!\d))/g
  //
  //  Token-by-token breakdown:
  //
  //    \B          – NON-word-boundary position.
  //                  Matches a position that is NOT at the very start of the
  //                  string and NOT right after a non-word character.
  //                  This prevents a separator being inserted before the first
  //                  digit (e.g. ",1,234" would be wrong).
  //
  //    (?=         – POSITIVE LOOKAHEAD — zero-width assertion.
  //                  "The following characters must match, but don't consume them."
  //                  The regex engine peeks ahead without advancing its position.
  //
  //      (\d{3})+  – one or more groups of EXACTLY THREE digits.
  //                    \d   = any digit
  //                    {3}  = exactly 3 of them
  //                    +    = one or more such groups (so 3, 6, 9, 12 … digits ahead)
  //
  //      (?!\d)    – NEGATIVE LOOKAHEAD.
  //                  "What follows the groups of 3 is NOT another digit."
  //                  This anchors the groups to the END of the number so the
  //                  separator only lands at multiples of 3 from the RIGHT.
  //
  //    )           – close the positive lookahead
  //    g           – global: insert at every valid position
  //
  //  How the engine works step-by-step on '1234567':
  //
  //    Position between '1' and '2'  → lookahead sees '234567' → 6 digits → 6=3×2 ✔ → INSERT
  //    Position between '2' and '3'  → lookahead sees '34567'  → 5 digits → not ÷3 ✖
  //    Position between '3' and '4'  → lookahead sees '4567'   → 4 digits → not ÷3 ✖
  //    Position between '4' and '5'  → lookahead sees '567'    → 3 digits → 3=3×1 ✔ → INSERT
  //    … and so on
  //    Result → '1,234,567'
  //
  //  Works with ANY separator — just change the replacement string:
  //    '1234567'.replace(REGEX.THOUSANDS_SEPARATOR_POSITIONS, ',')  → '1,234,567'
  //    '1234567'.replace(REGEX.THOUSANDS_SEPARATOR_POSITIONS, '.')  → '1.234.567'
  //    '1234567'.replace(REGEX.THOUSANDS_SEPARATOR_POSITIONS, ' ')  → '1 234 567'
  //    '1234567'.replace(REGEX.THOUSANDS_SEPARATOR_POSITIONS, '_')  → '1_234_567'
  //
  //  More examples:
  //    '1234'      → '1,234'
  //    '100'       → '100'         (fewer than 4 digits — no separator)
  //    '1000000'   → '1,000,000'
  //
  THOUSANDS_SEPARATOR_POSITIONS: /\B(?=(\d{3})+(?!\d))/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 9. REGEX_SPECIAL_CHARACTERS
  //    Escape any character that has a special meaning inside a RegExp pattern.
  //    Used before passing a user-supplied string into new RegExp(…).
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Why this is needed:
  //    The thousandSeparator input can be '.', which inside a regex means
  //    "any character", not a literal dot.  Before building
  //    new RegExp(thousandSeparator, 'g') we must escape it to '\.'
  //    so it matches only a literal period.
  //
  //  The replacement string '\\$&' means:
  //    \\  – insert a literal backslash
  //    $&  – followed by the matched character itself
  //    So '.' becomes '\.' and '(' becomes '\(' etc.
  //
  //  Pattern breakdown (character class contents):
  //    .      – dot
  //    *      – asterisk
  //    +      – plus
  //    ?      – question mark
  //    ^      – caret
  //    $      – dollar sign
  //    {  }   – curly braces
  //    (  )   – parentheses
  //    |      – pipe
  //    [      – open bracket
  //    \]     – close bracket (must be escaped to close the class correctly)
  //    \\     – backslash (represents a single \)
  //    g      – global
  //
  //  Used in:  _stripDecoration(), _stripPatternSeparators()
  //            Anywhere a dynamic string is inserted into new RegExp(…)
  //
  //  Examples:
  //    '.'.replace(REGEX.REGEX_SPECIAL_CHARACTERS, '\\$&')   →  '\\.'
  //    ','.replace(REGEX.REGEX_SPECIAL_CHARACTERS, '\\$&')   →  ','   (no change)
  //    '('.replace(REGEX.REGEX_SPECIAL_CHARACTERS, '\\$&')   →  '\\('
  //    ' '.replace(REGEX.REGEX_SPECIAL_CHARACTERS, '\\$&')   →  ' '   (no change)
  //
  REGEX_SPECIAL_CHARACTERS: /[.*+?^${}()|[\]\\]/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 10. LEADING_ZEROS
  //     Remove leading zeros from the integer part, keeping at least one digit.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Pattern breakdown:
  //    ^     – anchor at the start of the string
  //    0+    – one or more '0' characters (the leading zeros to remove)
  //    (     – open capture group 1
  //    \d    – one digit (the first SIGNIFICANT digit after the zeros)
  //    )     – close capture group 1
  //
  //  No 'g' flag — we only care about the beginning of the string.
  //
  //  Replacement '$1':
  //    $1 = capture group 1 = the first significant digit.
  //    The entire match (zeros + that digit) is replaced by just that digit.
  //    Any digits AFTER it in the string are left untouched.
  //
  //  Used in:  _stripLeadingZeros()
  //
  //  Examples:
  //    '007'.replace(REGEX.LEADING_ZEROS, '$1')    →  '7'
  //    '0042'.replace(REGEX.LEADING_ZEROS, '$1')   →  '42'
  //    '0.5'.replace(REGEX.LEADING_ZEROS, '$1')    →  '0.5'   (no match — char after 0 is '.')
  //    '100'.replace(REGEX.LEADING_ZEROS, '$1')    →  '100'   (no match — first char is '1')
  //    '0'.replace(REGEX.LEADING_ZEROS, '$1')      →  '0'     (no match — no digit after the 0)
  //
  LEADING_ZEROS: /^0+(\d)/,

  // ──────────────────────────────────────────────────────────────────────────
  // 11. ARABIC_DIGITS
  //     Match Arabic-Indic digit characters (used across Middle East & South Asia).
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Unicode range:
  //    \u0660  = Arabic-Indic digit zero  ٠
  //    \u0669  = Arabic-Indic digit nine  ٩
  //    [\u0660-\u0669] matches any of the 10 Arabic-Indic digit characters.
  //
  //  g flag: replace ALL occurrences in one pass.
  //
  //  Used in:  convertEasternDigits() in eastern-numerals.ts
  //
  //  Background:
  //    Arabic keyboards and some IMEs output these instead of 0–9.
  //    Unicode offset from Western digit: charCode - 0x0660 + 48 ('0')
  //    e.g.  '٥'.charCodeAt(0) = 0x0665 → 0x0665 - 0x0660 = 5 → '5'
  //
  //  Examples:
  //    '١٢٣'.replace(REGEX.ARABIC_DIGITS, …)   →  '123'
  //    '٠٩'.replace(REGEX.ARABIC_DIGITS, …)    →  '09'
  //
  ARABIC_DIGITS: /[\u0660-\u0669]/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 12. PERSIAN_DIGITS
  //     Match Extended Arabic-Indic digit characters used in Persian / Farsi.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Unicode range:
  //    \u06F0  = Extended Arabic-Indic digit zero  ۰
  //    \u06F9  = Extended Arabic-Indic digit nine  ۹
  //
  //  Persian digits are a DIFFERENT Unicode block from Arabic digits even though
  //  they look similar:
  //    Arabic zero  ٠  =  U+0660
  //    Persian zero ۰  =  U+06F0   ← different code point!
  //
  //  Both blocks need separate patterns.
  //
  //  g flag: replace ALL occurrences.
  //
  //  Used in:  convertEasternDigits() in eastern-numerals.ts
  //
  //  Examples:
  //    '۱۲۳'.replace(REGEX.PERSIAN_DIGITS, …)  →  '123'
  //    '۰۹'.replace(REGEX.PERSIAN_DIGITS, …)   →  '09'
  //
  PERSIAN_DIGITS: /[\u06F0-\u06F9]/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 13. ARABIC_DECIMAL_COMMA
  //     Match the Arabic decimal comma character ٫ (U+066B).
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  In Arabic locale, the decimal separator is ٫ (Arabic Decimal Separator)
  //  not the Western period '.'.  We convert it to '.' so the rest of the
  //  directive can process it uniformly.
  //
  //  Used in:  convertEasternDigits() in eastern-numerals.ts
  //
  //  Example:
  //    '١٢٫٥'.replace(REGEX.ARABIC_DECIMAL_COMMA, '.')  →  '١٢.٥'
  //    (then after digit conversion)                       →  '12.5'
  //
  ARABIC_DECIMAL_COMMA: /\u066B/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 14. ARABIC_THOUSANDS_SEPARATOR
  //     Match the Arabic thousands separator ٬ (U+066C).
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Similar to the decimal comma above: the Arabic locale uses U+066C as its
  //  thousands grouping character.  We strip it so the directive does not
  //  mistake it for a digit.
  //
  //  Used in:  convertEasternDigits() in eastern-numerals.ts
  //
  //  Example:
  //    '١٬٢٣٤'.replace(REGEX.ARABIC_THOUSANDS_SEPARATOR, '')  →  '١٢٣٤'
  //
  ARABIC_THOUSANDS_SEPARATOR: /\u066C/g,

  // ──────────────────────────────────────────────────────────────────────────
  // 15. ARABIC_DIGIT_RANGE
  //     The Unicode code-point boundaries for Arabic-Indic digit characters.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Unlike ARABIC_DIGITS (which is a /g regex used with .replace()), these
  //  are plain string constants used for a boundary COMPARISON in onKeyDown():
  //
  //    pressedKey >= REGEX.ARABIC_DIGIT_RANGE.FIRST &&
  //    pressedKey <= REGEX.ARABIC_DIGIT_RANGE.LAST
  //
  //  Why not reuse ARABIC_DIGITS here?
  //    ARABIC_DIGITS has the global 'g' flag and is designed for .replace()
  //    across an entire string.  A single-character range check via >= / <=
  //    is simpler, has no flag state to worry about, and is O(1).
  //    JavaScript compares strings by Unicode code point, so this works
  //    correctly for single characters.
  //
  //  Used in:  onKeyDown() — to allow Eastern keystrokes through before
  //            onInput() converts them to Western digits.
  //
  //  Examples:
  //    '١' >= REGEX.ARABIC_DIGIT_RANGE.FIRST  →  true   (U+0661 >= U+0660)
  //    '١' <= REGEX.ARABIC_DIGIT_RANGE.LAST   →  true   (U+0661 <= U+0669)
  //    'a' >= REGEX.ARABIC_DIGIT_RANGE.FIRST  →  false  (U+0061 < U+0660)
  //
  ARABIC_DIGIT_RANGE: {
    FIRST: '\u0660', // ٠  Arabic-Indic digit ZERO
    LAST: '\u0669', // ٩  Arabic-Indic digit NINE
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 16. PERSIAN_DIGIT_RANGE
  //     The Unicode code-point boundaries for Persian digit characters.
  // ──────────────────────────────────────────────────────────────────────────
  //
  //  Same idea as ARABIC_DIGIT_RANGE above, but for the Persian/Extended
  //  Arabic-Indic block (U+06F0–U+06F9).
  //
  //  Persian digits live in a DIFFERENT Unicode block from Arabic digits
  //  even though they look similar:
  //    Arabic zero  ٠  =  U+0660
  //    Persian zero ۰  =  U+06F0  ← different block, needs its own range
  //
  //  Used in:  onKeyDown() — same purpose as ARABIC_DIGIT_RANGE.
  //
  //  Examples:
  //    '۶' >= REGEX.PERSIAN_DIGIT_RANGE.FIRST  →  true   (U+06F6 >= U+06F0)
  //    '۶' <= REGEX.PERSIAN_DIGIT_RANGE.LAST   →  true   (U+06F6 <= U+06F9)
  //    '١' >= REGEX.PERSIAN_DIGIT_RANGE.FIRST  →  false  (U+0661 < U+06F0)
  //
  PERSIAN_DIGIT_RANGE: {
    FIRST: '\u06F0', // ۰  Persian digit ZERO
    LAST: '\u06F9', // ۹  Persian digit NINE
  },

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// QUICK-REFERENCE TABLE
// ─────────────────────────────────────────────────────────────────────────────
//
//   Key                           Pattern                        Purpose
//   ──────────────────────────    ─────────────────────────────  ────────────────────────────────────────
//   SINGLE_DIGIT                  /^\d$/                         Is a keypress exactly one digit?
//   NON_DIGIT_CHARACTERS          /[^0-9]/g                      Strip everything except digits
//   ONLY_DIGITS_AND_MINUS         /[^0-9\-]/g                    Keep digits + minus  (integer paste)
//   ONLY_DIGITS_DOT_AND_MINUS     /[^0-9.\-]/g                   Keep digits + dot + minus (decimal paste)
//   ONLY_DIGITS                   /[^0-9]/g                      Keep digits only  (string/pattern paste)
//   ALL_DOTS                      /\./g                          Remove all literal dot characters
//   ALL_MINUS_SIGNS               /-/g                           Remove all minus/hyphen characters
//   THOUSANDS_SEPARATOR_POSITIONS /\B(?=(\d{3})+(?!\d))/g       Find positions for thousands separator
//   REGEX_SPECIAL_CHARACTERS      /[.*+?^${}()|[\]\\]/g         Escape chars before new RegExp(…)
//   LEADING_ZEROS                 /^0+(\d)/                      Strip leading zeros, keep ≥ 1 digit
//   ARABIC_DIGITS                 /[\u0660-\u0669]/g             Match Arabic-Indic digits ٠-٩
//   PERSIAN_DIGITS                /[\u06F0-\u06F9]/g             Match Persian digits ۰-۹
//   ARABIC_DECIMAL_COMMA          /\u066B/g                      Arabic decimal separator ٫ → '.'
//   ARABIC_THOUSANDS_SEPARATOR    /\u066C/g                      Arabic grouping separator ٬ → strip
//   ARABIC_DIGIT_RANGE            { FIRST: '\u0660', LAST: '\u0669' }   Boundary check for Arabic digits in keydown
//   PERSIAN_DIGIT_RANGE           { FIRST: '\u06F0', LAST: '\u06F9' }   Boundary check for Persian digits in keydown
