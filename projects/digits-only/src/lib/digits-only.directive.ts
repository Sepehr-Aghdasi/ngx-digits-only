/**
 * digits-only.directive.ts
 *
 * A self-contained Angular directive that replicates the key numeric features
 * of ngx-mask without any external dependency.
 *
 * ─── Files in this module ─────────────────────────────────────────────────────
 *
 *   digits-only.directive.ts   ← you are here — the Angular directive
 *   digits-only.regex.ts       ← every RegExp constant with detailed explanations
 *   digits-only.module.ts       ← NgModule that declares and exports the directive
 *   eastern-numerals.ts            ← standalone Arabic / Persian → Western digit converter
 *
 * ─── Features ─────────────────────────────────────────────────────────────────
 *
 *   [digitsOnly]              Selector — add to any <input> element
 *   [decimalPlaces]           Number of decimal places allowed (default: 0 = integers)
 *   [thousandSeparator]       Visual grouping character: ',' | '.' | ' ' | '_' | ''
 *   [prefix]                  Visual prefix shown in input (e.g. '$') — stripped from model
 *   [suffix]                  Visual suffix shown in input (e.g. '%') — stripped from model
 *   [allowNegative]           Allow a leading minus sign (default: false)
 *   [leadingZeros]            Preserve leading zeros like '007' (default: false)
 *   [maxLength]               Maximum number of raw digits allowed
 *   [min]                     Minimum numeric value (validation, number mode only)
 *   [max]                     Maximum numeric value (validation, number mode only)
 *   [outputType]              'number' (default) | 'string' — type emitted to the model
 *   [pattern]                 Display-format mask: '0000 0000 0000 0000' or named alias
 *   [convertEasternNumerals]  Convert Arabic/Persian digits to Western on input (default: true)
 *
 * ─── outputType ───────────────────────────────────────────────────────────────
 *
 *   'number' (default)
 *     Model receives:  number | null
 *     Use for:         prices, quantities, temperatures — values used in arithmetic
 *     Note:            Leading zeros are lost (007 → 7); values beyond
 *                      Number.MAX_SAFE_INTEGER may lose precision
 *
 *   'string'
 *     Model receives:  string | null
 *     Use for:         card numbers, phone numbers, postal codes, SSNs, OTPs —
 *                      digit strings that are identifiers, not quantities
 *     Note:            Leading zeros are always preserved; no precision limit
 *
 * ─── pattern ──────────────────────────────────────────────────────────────────
 *
 *   A mask string made of '0' (digit slot) and any other character (separator).
 *   Separators are inserted in the display automatically but NEVER reach the model.
 *   Setting a pattern forces outputType='string' and derives maxLength automatically.
 *
 *   Named aliases:
 *     'card'       →  '0000 0000 0000 0000'   Visa / Mastercard (16 digits)
 *
 * ─── convertEasternNumerals ───────────────────────────────────────────────────
 *
 *   When true (default), Arabic-Indic (٠١٢٣٤٥٦٧٨٩) and Persian (۰۱۲۳۴۵۶۷۸۹)
 *   digit characters are silently converted to their Western equivalents before
 *   any processing.  This allows users on Arabic / Persian keyboards to type
 *   naturally into any digitsOnly field.
 *   Set to false only if you specifically need to block Eastern numerals.
 *
 * ─── Usage examples ───────────────────────────────────────────────────────────
 *
 *   <!-- Integer amount, $ prefix, comma thousands -->
 *   <input digitsOnly thousandSeparator="," prefix="$" formControlName="salary" />
 *
 *   <!-- Decimal price, 2 places -->
 *   <input digitsOnly [decimalPlaces]="2" thousandSeparator="," formControlName="price" />
 *
 *   <!-- Card number with automatic space grouping -->
 *   <input digitsOnly pattern="card" formControlName="cardNumber" />
 *
 *   <!-- Custom pattern -->
 *   <input digitsOnly pattern="000-00-0000" formControlName="ssn" />
 *
 *   <!-- Opt out of Eastern numeral conversion -->
 *   <input digitsOnly [convertEasternNumerals]="false" formControlName="code" />
 */

import {
  Directive,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Renderer2,
  SimpleChanges,
  forwardRef,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

import { REGEX } from './digits-only.regex';
import { convertEasternDigits } from './eastern-numerals';

// ─────────────────────────────────────────────────────────────────────────────
// Unicode directional constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Left-to-Right Mark (U+200E) — an invisible zero-width Unicode character.
 *
 * WHY IT IS NEEDED:
 *   In RTL documents (dir="rtl"), the browser's Unicode Bidirectional Algorithm
 *   (UBA) may try to mirror numeric content — reordering digits or misplacing
 *   separators like commas.  For example, "1,234" can display as "234,1" in
 *   some bidi contexts.
 *
 *   Prepending LRM to the input value tells the bidi algorithm:
 *   "treat everything that follows as left-to-right text".
 *   Numbers, thousands separators, and decimal points always read correctly.
 *
 * ZERO IMPACT ON MODEL:
 *   LRM is stripped inside stripDecorationsFrom() before any value reaches
 *   the model, so your component never sees this character.
 *
 * BROWSER SUPPORT:
 *   All modern browsers respect U+200E in input values.
 */
const LRM = '\u200E'; // Left-to-Right Mark — invisible, prevents bidi digit mirroring

// ─────────────────────────────────────────────────────────────────────────────
// Named pattern registry + type
// ─────────────────────────────────────────────────────────────────────────────
// '0' = digit slot, any other character = literal separator inserted in display.

export type NamedPattern = 'card';


/**
 * Maps every NamedPattern alias to its full mask string.
 * Typed as Record<NamedPattern, string> so TypeScript catches missing entries —
 * add a new entry here and the type forces you to add it to NamedPattern too.
 */
const NAMED_PATTERNS: Record<NamedPattern, string> = {
  'card': '0000 0000 0000 0000',
};

/**
 * Type guard that narrows an arbitrary string to NamedPattern.
 *
 * Using the `in` operator against NAMED_PATTERNS tells TypeScript:
 * "if this key exists in the object, treat it as NamedPattern from here on".
 * This is the only way to safely index Record<NamedPattern, string> with a
 * value that might be a NamedPattern OR a plain custom pattern string.
 *
 * @example
 *   isNamedPattern('card')     // true  → safe to use as NAMED_PATTERNS key
 *   isNamedPattern('000-0000') // false → treat as raw custom pattern
 */
function isNamedPattern(value: string): value is NamedPattern {
  return value in NAMED_PATTERNS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Directive
// ─────────────────────────────────────────────────────────────────────────────

@Directive({
  selector: '[digitsOnly]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => digitsOnlyDirective),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => digitsOnlyDirective),
      multi: true,
    },
  ],
})
export class digitsOnlyDirective implements ControlValueAccessor, Validator, OnInit, OnChanges {

  // ─── Public inputs ──────────────────────────────────────────────────────────

  /** How many decimal places are allowed. 0 = integers only. Ignored when pattern is set. */
  @Input() decimalPlaces = 0;

  /** Visual grouping character inserted between digit groups. Ignored when pattern is set. */
  @Input() thousandSeparator: '' | ',' | '.' | ' ' | '_' = '';

  /** Visual text prepended to the displayed value (e.g. '$'). Never reaches the model. */
  @Input() prefix = '';

  /** Visual text appended to the displayed value (e.g. '%'). Never reaches the model. */
  @Input() suffix = '';

  /** When true, a leading minus '-' is allowed for negative numbers. */
  @Input() allowNegative = false;

  /** When true, leading zeros (e.g. '007') are preserved in the model value. */
  @Input() leadingZeros = false;

  /** Maximum number of raw digit characters the user may enter. */
  @Input() maxLength: number | null = null;

  /** Minimum allowed numeric value. Produces a 'min' validation error when violated. */
  @Input() min: number | null = null;

  /** Maximum allowed numeric value. Produces a 'max' validation error when violated. */
  @Input() max: number | null = null;

  /**
   * Controls the JavaScript type emitted to the form model.
   * 'number' (default) → number | null
   * 'string'           → string | null
   * Automatically overridden to 'string' when [pattern] is set.
   */
  @Input() outputType: 'number' | 'string' = 'number';

  /**
   * When true (default), Arabic-Indic and Persian digit characters typed or
   * pasted by the user are automatically converted to Western digits 0-9
   * before any processing happens.
   *
   * Safe to leave enabled for all use cases — the conversion only touches
   * characters in the Unicode ranges U+0660–U+0669 and U+06F0–U+06F9,
   * which have zero overlap with any ASCII character.
   */
  @Input() convertEasternNumerals = true;

  /**
   * Display-format mask string or a named alias (see NamedPattern type).
   *
   * Typed as  NamedPattern | (string & {})  so that:
   *   • Named aliases are autocompleted in IDEs and validated at compile time.
   *   • Custom raw patterns like '000-0000' are still accepted without error.
   *
   * '0' = digit slot, any other char = literal separator auto-inserted in display.
   * Setting this forces outputType='string' and derives maxLength from slot count.
   *
   * @example
   *   pattern="card"           → '0000 0000 0000 0000'
   *   pattern="00/00/0000"     → custom date pattern
   */
  @Input() set pattern(value: NamedPattern | (string & {})) {
    // Type guard: check whether the value is one of the known NamedPattern keys
    // before indexing NAMED_PATTERNS with it.
    //
    // Why this is needed:
    //   NAMED_PATTERNS is typed as Record<NamedPattern, string>, meaning its
    //   index signature only accepts NamedPattern keys — not arbitrary strings.
    //   The @Input type is NamedPattern | (string & {}), so `value` could be
    //   a custom raw pattern like '000-0000' that is NOT a key of NAMED_PATTERNS.
    //   Indexing with it directly causes TS error ts(7053):
    //   "No index signature with a parameter of type 'string' was found".
    //
    //   The fix: use `value in NAMED_PATTERNS` as a type guard. The `in` operator
    //   narrows the type of `value` to NamedPattern inside the if-branch, making
    //   NAMED_PATTERNS[value] type-safe. In the else-branch `value` is treated
    //   as a raw custom pattern string and used directly.
    if (isNamedPattern(value)) {
      this._resolvedPattern = NAMED_PATTERNS[value]; // value is NamedPattern
    } else {
      this._resolvedPattern = value;                 // value is a raw custom pattern
    }
  }

  // ─── Internal state ──────────────────────────────────────────────────────────

  /** Full pattern string after named-alias resolution. Empty string = no pattern. */
  private _resolvedPattern = '';

  /**
   * The canonical internal value: pure digits (and optional '.' and '-').
   * No prefix, suffix, separators, or pattern characters ever live here.
   * Every other method reads or writes this field.
   */
  private _rawValue = '';

  // ControlValueAccessor callbacks registered by Angular forms
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _onChange: (value: any) => void = () => { };
  private _onTouched: () => void = () => { };
  private _onValidatorChange: () => void = () => { };

  // ─── Computed properties ────────────────────────────────────────────────────

  /** True when a format pattern has been set on this input. */
  private get hasPattern(): boolean {
    return this._resolvedPattern.length > 0;
  }

  /**
   * The set of literal separator characters defined in the current pattern.
   *
   * Pattern '(000) 000-0000' → separators: {'(', ')', ' ', '-'}
   * Pattern '0000 0000'      → separators: {' '}
   *
   * Used when stripping decorations back off a displayed value.
   */
  private get patternSeparatorChars(): Set<string> {
    return new Set(
      this._resolvedPattern.split('').filter(char => char !== '0')
    );
  }

  /**
   * The total number of digit slots ('0' characters) in the current pattern.
   * 'card' pattern has 16 slots; 'expiry' has 4; etc.
   */
  private get patternDigitSlotCount(): number {
    return this._resolvedPattern.split('').filter(char => char === '0').length;
  }

  /**
   * The effective maximum digit length to enforce.
   * In pattern mode, this is always the slot count (overrides any [maxLength] input).
   * In non-pattern mode, it comes from the [maxLength] input (may be null = unlimited).
   */
  private get effectiveMaxLength(): number | null {
    return this.hasPattern ? this.patternDigitSlotCount : this.maxLength;
  }

  /**
   * The effective output type.
   * Pattern mode always emits strings because patterns are for identifiers.
   * Otherwise respects the [outputType] input.
   */
  private get effectiveOutputType(): 'number' | 'string' {
    return this.hasPattern ? 'string' : this.outputType;
  }

  /**
   * The decimal separator character used in the DISPLAY.
   * If the thousands separator is '.' (European style), we must use ','
   * as the decimal character to avoid ambiguity (1.234,56 is valid; 1,234,56 is not).
   * Otherwise we use the standard '.'.
   */
  private get displayDecimalChar(): string {
    return this.thousandSeparator === '.' ? ',' : '.';
  }

  /**
   * Returns true when the input element (or any of its ancestors) is in
   * right-to-left mode.
   *
   * Detection order:
   *   1. The input element's own computed `direction` style — this reflects
   *      any `dir` attribute on the element itself, a CSS `direction` rule,
   *      or inheritance from a parent element with dir="rtl".
   *   2. Falls back to false (LTR) if the window / getComputedStyle is
   *      unavailable (e.g. server-side rendering).
   *
   * This is a getter (not a cached field) so it always reflects the current
   * DOM state, even if the direction changes dynamically at runtime.
   */
  private get isRtl(): boolean {
    const win = this.document.defaultView;
    if (!win) return false;
    const dir = win.getComputedStyle(this.el.nativeElement).direction;
    return dir === 'rtl';
  }

  /**
   * In RTL mode the string stored in the input is prefixed with an LRM mark
   * so that the bidi algorithm does not reorder digits or separators.
   * This helper returns the prefix length including the LRM when RTL is active.
   *
   * Used wherever we need to know "how many characters before the editable
   * number portion start" — cursor clamping, minus-key position check, etc.
   */
  private get editableStartOffset(): number {
    // In RTL: LRM + suffix occupies the left side of the display string.
    // In LTR: prefix occupies the left side.
    return this.isRtl
      ? LRM.length + this.suffix.length   // RTL: [LRM][suffix][number][prefix]
      : this.prefix.length;               // LTR: [prefix][number][suffix]
  }

  /**
   * The number of characters at the RIGHT end of the display string that
   * belong to the suffix (LTR) or prefix (RTL) — i.e. characters the cursor
   * must never move past on the right side.
   */
  private get editableEndPadding(): number {
    return this.isRtl ? this.prefix.length : this.suffix.length;
  }

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
  ) { }

  // ─── Angular lifecycle ────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Always use numeric inputMode so mobile keyboards show the number pad
    // regardless of document direction.
    this.renderer.setAttribute(this.el.nativeElement, 'inputmode', 'numeric');

    // Render the initial empty state into the input element.
    // refreshDisplay() also sets the dir attribute on first call.
    this.refreshDisplay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { prefix, suffix, thousandSeparator, decimalPlaces, outputType, pattern } = changes;

    // Re-render whenever any display-affecting input changes
    const displayInputsChanged =
      prefix ||
      suffix ||
      thousandSeparator ||
      decimalPlaces ||
      outputType ||
      pattern;

    if (displayInputsChanged) {
      this.refreshDisplay();
    }
  }

  // ─── ControlValueAccessor ────────────────────────────────────────────────────
  // These four methods are the bridge between the directive and Angular forms.

  /** Angular calls this when the form model value changes programmatically. */
  writeValue(value: string | number | null): void {
    if (value === null || value === undefined || value === '') {
      this._rawValue = '';
    } else {
      const stringValue = String(value);

      if (this.hasPattern) {
        // Strip any separators that may already be in the incoming string value
        this._rawValue = this.stripPatternSeparatorsFrom(stringValue);
      } else {
        // Normalize decimal separator to '.' for internal storage
        this._rawValue = stringValue.replace(',', '.');
      }
    }

    this.refreshDisplay();
  }

  /** Angular calls this to register the function we must call when our value changes. */
  registerOnChange(fn: (v: number | string | null) => void): void {
    this._onChange = fn;
  }

  /** Angular calls this to register the function we must call when the field is touched. */
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  /** Angular calls this to enable or disable the input. */
  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, 'disabled', isDisabled);
  }

  // ─── Validator ───────────────────────────────────────────────────────────────

  /** Angular calls this to ask whether the current value has any errors. */
  validate(_control: AbstractControl): ValidationErrors | null {
    const errors: ValidationErrors = {};
    const raw = this._rawValue;

    // Empty or partial-minus input: let [required] handle the "is it filled?" check
    if (raw === '' || raw === '-') {
      return null;
    }

    // ── Pattern mode validation ──────────────────────────────────────────────
    if (this.hasPattern) {
      const filledDigitCount = raw.replace(REGEX.NON_DIGIT_CHARACTERS, '').length;
      const requiredDigitCount = this.patternDigitSlotCount;

      // The user must fill ALL slots before the value is considered complete
      if (filledDigitCount < requiredDigitCount) {
        errors['patternIncomplete'] = {
          required: requiredDigitCount,
          actual: filledDigitCount,
          pattern: this._resolvedPattern,
        };
      }

      return Object.keys(errors).length > 0 ? errors : null;
    }

    // ── Non-pattern: maxLength check ─────────────────────────────────────────
    const maxLen = this.effectiveMaxLength;
    if (maxLen !== null) {
      const digitCount = raw.replace(REGEX.NON_DIGIT_CHARACTERS, '').length;
      if (digitCount > maxLen) {
        errors['maxLength'] = { maxLength: maxLen, actual: digitCount };
      }
    }

    // ── String output: no numeric range validation needed ────────────────────
    // Identifiers (card numbers, phones) don't have a meaningful min/max.
    if (this.effectiveOutputType === 'string') {
      return Object.keys(errors).length > 0 ? errors : null;
    }

    // ── Number output: range validation ──────────────────────────────────────
    const numericValue = parseFloat(raw);

    if (isNaN(numericValue)) {
      errors['digits'] = { actual: raw };
    }

    if (this.min !== null && numericValue < this.min) {
      errors['min'] = { min: this.min, actual: numericValue };
    }

    if (this.max !== null && numericValue > this.max) {
      errors['max'] = { max: this.max, actual: numericValue };
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  /** Angular calls this to register the function we call when validation rules change. */
  registerOnValidatorChange(fn: () => void): void {
    this._onValidatorChange = fn;
  }

  // ─── DOM event handlers ────────────────────────────────────────────────────

  /**
   * Intercept keydown BEFORE the character lands in the input.
   * This is our first line of defense — blocking bad keys entirely
   * so the input event never fires for them.
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {

    // Always pass through control keys (Backspace, arrows, Ctrl+C, etc.)
    if (this.isControlKey(event)) {
      return;
    }

    const pressedKey = event.key;

    // ── Allow minus sign (number mode only, not pattern mode) ─────────────
    const isMinusKey = pressedKey === '-';
    const minusIsAllowed =
      this.allowNegative &&
      !this.hasPattern &&
      this.effectiveOutputType === 'number';

    // The "start of the editable number region" depends on direction:
    //   LTR: cursor must be at prefix.length (characters the prefix occupies)
    //   RTL: cursor must be at LRM.length + suffix.length (LRM + suffix on left)
    // editableStartOffset encapsulates this logic so onKeyDown stays clean.
    const cursorPosition = this.el.nativeElement.selectionStart ?? 0;
    const cursorIsAtStart = cursorPosition === this.editableStartOffset;

    const noMinusYet = !this._rawValue.startsWith('-');

    if (isMinusKey && minusIsAllowed && cursorIsAtStart && noMinusYet) {
      return; // allow the minus through
    }

    // ── Allow decimal point (number mode only, no pattern) ────────────────
    const isDecimalKey = pressedKey === '.' || pressedKey === ',';
    const decimalIsAllowed = this.decimalPlaces > 0 && !this.hasPattern;
    const noDecimalYet = !this._rawValue.includes('.');

    if (isDecimalKey && decimalIsAllowed && noDecimalYet) {
      return; // allow the decimal separator through
    }

    // ── Allow digit keys (0–9 AND Eastern Arabic/Persian digits) ────────────
    //
    // IMPORTANT: REGEX.SINGLE_DIGIT only matches ASCII digits /^\d$/ (U+0030–U+0039).
    // Arabic-Indic digits ٠-٩ (U+0660–U+0669) and Persian digits ۰-۹ (U+06F0–U+06F9)
    // are NOT matched by \d, so they would fall through to the "block everything else"
    // branch and be prevented — even when convertEasternNumerals is true.
    //
    // The fix: also check for Eastern digit characters here in keydown.
    // The actual conversion from Eastern → Western happens later in onInput(),
    // so all we need to do here is let the keystroke land in the input.
    const isWesternDigit = REGEX.SINGLE_DIGIT.test(pressedKey);
    const isArabicDigit = pressedKey >= REGEX.ARABIC_DIGIT_RANGE.FIRST &&
      pressedKey <= REGEX.ARABIC_DIGIT_RANGE.LAST;
    const isPersianDigit = pressedKey >= REGEX.PERSIAN_DIGIT_RANGE.FIRST &&
      pressedKey <= REGEX.PERSIAN_DIGIT_RANGE.LAST;
    const isEasternDigit = this.convertEasternNumerals && (isArabicDigit || isPersianDigit);
    const isDigitKey = isWesternDigit || isEasternDigit;

    if (isDigitKey) {
      // Enforce the digit slot limit BEFORE the character is inserted.
      // Count only the raw digits already in the value (exclude separators/prefix/suffix).
      const maxLen = this.effectiveMaxLength;
      if (maxLen !== null) {
        const currentDigitCount = this._rawValue.replace(REGEX.NON_DIGIT_CHARACTERS, '').length;
        const selectedChars = Math.abs(
          (this.el.nativeElement.selectionEnd ?? 0) -
          (this.el.nativeElement.selectionStart ?? 0)
        );
        const nothingSelected = selectedChars === 0;

        if (nothingSelected && currentDigitCount >= maxLen) {
          event.preventDefault(); // already at limit — block the digit
          return;
        }
      }
      return; // digit is allowed — Eastern digits will be converted in onInput()
    }

    // ── Block everything else ─────────────────────────────────────────────
    event.preventDefault();
  }

  /**
   * Process input AFTER the character has landed in the input element.
   * We read the new display value, strip decorations to get raw digits,
   * apply rules (decimal limits, maxLength, leading zeros), then re-render.
   */
  @HostListener('input')
  onInput(): void {
    const inputEl = this.el.nativeElement;
    const cursorPositionBeforeReformat = inputEl.selectionStart ?? 0;
    const displayLengthBeforeReformat = inputEl.value.length;

    // Convert Eastern numerals FIRST, before anything else touches the value
    if (this.convertEasternNumerals) {
      const converted = convertEasternDigits(inputEl.value);
      if (converted !== inputEl.value) {
        // Write the converted value directly into the DOM so our stripping below
        // works on clean ASCII characters
        this.renderer.setProperty(inputEl, 'value', converted);
      }
    }

    // Strip prefix, suffix, and visual separators — extract the raw digit core
    let raw = this.stripDecorationsFrom(inputEl.value);

    if (this.hasPattern) {
      // Pattern mode: keep only digits, cap at slot count
      raw = raw.replace(REGEX.ONLY_DIGITS, '');
      raw = raw.slice(0, this.patternDigitSlotCount);

    } else {
      // Non-pattern mode: normalize decimal separator
      raw = raw.replace(',', '.');

      if (this.decimalPlaces === 0 || this.effectiveOutputType === 'string') {
        // Integer or string mode: no decimal points allowed
        raw = raw.replace(REGEX.ALL_DOTS, '');
      } else {
        // Decimal mode: allow exactly one dot with up to N decimal places
        raw = this.enforceDecimalRules(raw);
      }

      // Strip leading zeros unless explicitly preserved
      const shouldStripLeadingZeros =
        !this.leadingZeros && this.effectiveOutputType === 'number';
      if (shouldStripLeadingZeros) {
        raw = this.stripLeadingZeros(raw);
      }
    }

    this._rawValue = raw;
    this.refreshDisplay(cursorPositionBeforeReformat, displayLengthBeforeReformat);
    this._onChange(this.buildModelValue());
    this._onValidatorChange();
  }

  /**
   * When the user leaves the field, mark it as touched (triggers validation
   * display) and clean up any trailing decimal point (e.g. the user typed
   * '12.' and then tabbed away).
   */
  @HostListener('blur')
  onBlur(): void {
    this._onTouched();

    const hasTrailingDot =
      !this.hasPattern &&
      this.effectiveOutputType === 'number' &&
      this._rawValue.endsWith('.');

    if (hasTrailingDot) {
      this._rawValue = this._rawValue.slice(0, -1);
      this.refreshDisplay();
    }
  }

  /**
   * Handle paste events manually so we can sanitize the pasted content
   * before it reaches the input, just like we do for individual keystrokes.
   */
  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault(); // stop the browser from pasting the raw text

    const pastedText = event.clipboardData?.getData('text') ?? '';

    // Convert Eastern numerals in pasted content too
    const normalized = this.convertEasternNumerals
      ? convertEasternDigits(pastedText)
      : pastedText;

    // Sanitize the pasted string to only the characters our mode allows
    const sanitized = this.hasPattern
      ? normalized.replace(REGEX.ONLY_DIGITS, '')           // pattern: digits only
      : this.sanitizePastedText(normalized);                // non-pattern: mode-aware

    // Bail out if there's nothing usable to paste.
    // (Previously this also tried to special-case a paste of just '0', but
    //  comparing a value to both '' and '0' in the same check is a logical
    //  impossibility — a string can never be both at once — so that branch
    //  was unreachable dead code and TypeScript correctly flagged it.)
    if (sanitized === '') return;

    const inputEl = this.el.nativeElement;

    // Figure out where the cursor/selection is inside the RAW digit string
    const rawInsertStart = this.hasPattern
      ? this.mapDisplayCursorToRawIndex(inputEl.selectionStart ?? 0)
      : (inputEl.selectionStart ?? 0);
    const rawInsertEnd = this.hasPattern
      ? this.mapDisplayCursorToRawIndex(inputEl.selectionEnd ?? 0)
      : (inputEl.selectionEnd ?? 0);

    // Insert sanitized content into the raw value at the cursor position
    const beforeCursor = this._rawValue.slice(0, rawInsertStart);
    const afterCursor = this._rawValue.slice(rawInsertEnd);
    let newRaw = beforeCursor + sanitized + afterCursor;

    if (this.hasPattern) {
      // Pattern mode: keep digits only, cap at slot count
      newRaw = newRaw.replace(REGEX.ONLY_DIGITS, '').slice(0, this.patternDigitSlotCount);

    } else {
      // Non-pattern mode: apply the same rules as onInput
      if (this.decimalPlaces === 0 || this.effectiveOutputType === 'string') {
        newRaw = newRaw.replace(REGEX.ALL_DOTS, '');
      } else {
        newRaw = this.enforceDecimalRules(newRaw);
      }

      const maxLen = this.effectiveMaxLength;
      const rawDigitCount = newRaw.replace(REGEX.NON_DIGIT_CHARACTERS, '').length;
      if (maxLen !== null && rawDigitCount > maxLen) {
        return; // pasted content would exceed digit limit — discard
      }

      const shouldStripLeadingZeros =
        !this.leadingZeros && this.effectiveOutputType === 'number';
      if (shouldStripLeadingZeros) {
        newRaw = this.stripLeadingZeros(newRaw);
      }
    }

    this._rawValue = newRaw;
    this.refreshDisplay();
    this._onChange(this.buildModelValue());
    this._onValidatorChange();
  }

  /**
   * Block drag-and-drop into the field.
   * Without this a user could drag text from elsewhere and bypass our rules.
   */
  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
  }

  // ─── Private methods ───────────────────────────────────────────────────────

  /**
   * Build the value that gets emitted to the Angular form model.
   *
   * Pattern / string mode  →  string | null
   *   ''    → null   (empty field)
   *   '123' → '123'  (raw digits, leading zeros preserved, no separators)
   *
   * Number mode  →  number | null
   *   ''    → null   (empty field)
   *   '-'   → null   (user typed a minus but no digits yet)
   *   '123' → 123
   *   '1.5' → 1.5
   *   '-7'  → -7
   */
  private buildModelValue(): number | string | null {
    if (this._rawValue === '') {
      return null;
    }

    if (this.effectiveOutputType === 'string') {
      return this._rawValue || null;
    }

    // Number mode
    if (this._rawValue === '-') {
      return null; // not a valid number yet
    }

    const num = parseFloat(this._rawValue);
    return isNaN(num) ? null : num;
  }

  /**
   * Write the formatted display string back to the <input> DOM element
   * and try to restore the cursor to a sensible position.
   *
   * @param cursorBefore  Cursor position in the display string BEFORE we reformatted
   * @param lengthBefore  Total display string length BEFORE we reformatted
   */
  private refreshDisplay(cursorBefore?: number, lengthBefore?: number): void {
    // ── Step 1: format the number portion ─────────────────────────────────
    const formattedContent = this.hasPattern
      ? this.applyPatternFormatting(this._rawValue)
      : this.effectiveOutputType === 'string'
        ? this._rawValue                                  // string mode: no formatting
        : this.applyThousandsFormatting(this._rawValue);  // number mode: comma groups

    // ── Step 2: assemble the full display string ───────────────────────────
    //
    // RTL layout:  [LRM][suffix][formattedNumber][prefix]
    // LTR layout:  [prefix][formattedNumber][suffix]
    //
    // WHY SWAP PREFIX AND SUFFIX IN RTL?
    //   In RTL reading order, the "start" of a line is the right side.
    //   A currency symbol like "﷼" (Rial) naturally sits on the RIGHT of
    //   the number in Arabic/Persian convention, while a unit like "kg"
    //   sits on the LEFT.  That maps to: prefix visually right, suffix left.
    //   By swapping their positions in the string, the bidi algorithm places
    //   them correctly without any CSS changes.
    //
    // WHY LRM AT THE FRONT?
    //   Prevents the bidi algorithm from treating the numeric content as RTL
    //   text and mirroring digit order or separator placement.
    //   The LRM is stripped before the value reaches the model.
    const fullDisplayValue = this.isRtl
      ? LRM + this.suffix + formattedContent + this.prefix
      : this.prefix + formattedContent + this.suffix;

    this.renderer.setProperty(this.el.nativeElement, 'value', fullDisplayValue);

    // ── Step 3: restore cursor position ───────────────────────────────────
    if (cursorBefore !== undefined && lengthBefore !== undefined) {
      const lengthDelta = fullDisplayValue.length - lengthBefore;

      // Clamp cursor between the editable start and end offsets,
      // both of which account for the RTL/LTR decoration layout.
      const newCursorPos = Math.max(
        this.editableStartOffset,
        Math.min(
          cursorBefore + lengthDelta,
          fullDisplayValue.length - this.editableEndPadding,
        ),
      );

      // Defer to next animation frame so the browser has committed the new value
      requestAnimationFrame(() => {
        this.el.nativeElement.setSelectionRange(newCursorPos, newCursorPos);
      });
    }
  }

  /**
   * Apply the display format pattern to the current raw digit string.
   *
   * Algorithm:
   *   Walk through the pattern character by character.
   *   On '0': consume the next raw digit and add it to the result.
   *   On anything else: this is a separator — add it ONLY if more digits follow.
   *   (The "more digits follow" check prevents trailing separators mid-type.)
   *
   * Examples:
   *   pattern '0000 0000 0000 0000', raw '41111111'  →  '4111 1111'
   *   pattern '(000) 000-0000',      raw '5558675'   →  '(555) 867'
   *   pattern '00/00',               raw '122'       →  '12/2'
   */
  private applyPatternFormatting(raw: string): string {
    if (!this.hasPattern || !raw) {
      return raw;
    }

    const digits = raw.replace(REGEX.ONLY_DIGITS, ''); // isolated digit string
    let digitIndex = 0;
    let displayResult = '';

    for (const patternChar of this._resolvedPattern) {
      // Stop when we run out of digits to place
      if (digitIndex >= digits.length) {
        break;
      }

      if (patternChar === '0') {
        // Digit slot: consume the next digit
        displayResult += digits[digitIndex];
        digitIndex++;
      } else {
        // Separator character: insert it only when more digits are still coming
        // so we never show a trailing space/dash after the last typed digit
        const moreDigitsRemain = digitIndex < digits.length;
        if (moreDigitsRemain) {
          displayResult += patternChar;
        }
      }
    }

    return displayResult;
  }

  /**
   * Apply thousands separator grouping and decimal character to a raw number string.
   * Only used in number output mode (not pattern, not string mode).
   *
   * Examples (separator=',', decimalChar='.'):
   *   '1234567'   →  '1,234,567'
   *   '-9876.50'  →  '-9,876.50'
   *   '100'       →  '100'
   */
  private applyThousandsFormatting(raw: string): string {
    if (raw === '' || raw === '-') {
      return raw;
    }

    const isNegative = raw.startsWith('-');
    const absValue = isNegative ? raw.slice(1) : raw;
    const [integerPart, decimalPart] = absValue.split('.');

    // Insert the thousands separator every 3 digits from the right
    const formattedInteger = this.thousandSeparator
      ? integerPart.replace(REGEX.THOUSANDS_SEPARATOR_POSITIONS, this.thousandSeparator)
      : integerPart;

    const formattedDecimal = decimalPart !== undefined
      ? this.displayDecimalChar + decimalPart
      : '';

    return (isNegative ? '-' : '') + formattedInteger + formattedDecimal;
  }

  /**
   * Remove all visual decoration from the displayed input value and return
   * the bare digit/numeric string ready for internal storage.
   *
   * Steps:
   *   1. Strip prefix from the front
   *   2. Strip suffix from the back
   *   3. Remove pattern separators OR thousands separators (depending on mode)
   *   4. Normalize non-ASCII decimal separator back to '.'
   *   5. Remove any remaining non-numeric characters
   */
  private stripDecorationsFrom(displayValue: string): string {
    let raw = displayValue;

    // ── Remove the LRM marker if present ──────────────────────────────────
    // In RTL mode every display string starts with LRM (U+200E).
    // Strip it first so subsequent prefix/suffix checks work correctly.
    if (raw.startsWith(LRM)) {
      raw = raw.slice(LRM.length);
    }

    if (this.isRtl) {
      // RTL layout: [suffix][formattedNumber][prefix]
      // Remove suffix from the LEFT (start) and prefix from the RIGHT (end).
      if (this.suffix && raw.startsWith(this.suffix)) {
        raw = raw.slice(this.suffix.length);
      }
      if (this.prefix && raw.endsWith(this.prefix)) {
        raw = raw.slice(0, -this.prefix.length);
      }
    } else {
      // LTR layout: [prefix][formattedNumber][suffix]
      // Remove prefix from the LEFT and suffix from the RIGHT.
      if (this.prefix && raw.startsWith(this.prefix)) {
        raw = raw.slice(this.prefix.length);
      }
      if (this.suffix && raw.endsWith(this.suffix)) {
        raw = raw.slice(0, -this.suffix.length);
      }
    }

    if (this.hasPattern) {
      // Pattern mode: remove the separator characters defined by the pattern
      raw = this.stripPatternSeparatorsFrom(raw);
    } else if (this.thousandSeparator) {
      // Number mode with thousands grouping: remove the grouping character
      const escapedSeparator = this.thousandSeparator.replace(
        REGEX.REGEX_SPECIAL_CHARACTERS,
        '\\$&'  // prepend \ before any regex-special character
      );
      raw = raw.replace(new RegExp(escapedSeparator, 'g'), '');
    }

    // If we're using a non-standard decimal char (e.g. ',' in European mode),
    // normalize it back to '.' for internal storage
    if (!this.hasPattern && this.displayDecimalChar !== '.') {
      raw = raw.replace(this.displayDecimalChar, '.');
    }

    // Final sweep: remove anything that still isn't a digit, '.', or '-'
    raw = raw.replace(REGEX.ONLY_DIGITS_DOT_AND_MINUS, '');

    return raw;
  }

  /**
   * Remove every separator character that the current pattern defines.
   * For example, pattern '(000) 000-0000' defines '(', ')', ' ', '-' as separators.
   * This strips all four from the input string, leaving only digits.
   */
  private stripPatternSeparatorsFrom(value: string): string {
    let result = value;

    for (const separatorChar of this.patternSeparatorChars) {
      const escapedChar = separatorChar.replace(REGEX.REGEX_SPECIAL_CHARACTERS, '\\$&');
      result = result.replace(new RegExp(escapedChar, 'g'), '');
    }

    return result;
  }

  /**
   * Ensure a raw numeric string has at most one decimal point
   * and at most [decimalPlaces] digits after it.
   *
   * Examples (decimalPlaces=2):
   *   '12.345'  →  '12.34'
   *   '1.2.3'   →  '1.23'
   *   '100'     →  '100'
   */
  private enforceDecimalRules(raw: string): string {
    const parts = raw.split('.');

    // More than one dot? Collapse everything after the first dot into one decimal part
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }

    // Too many decimal digits? Truncate to the allowed count
    const [intPart, decPart] = raw.split('.');
    if (decPart !== undefined && decPart.length > this.decimalPlaces) {
      raw = intPart + '.' + decPart.slice(0, this.decimalPlaces);
    }

    return raw;
  }

  /**
   * Remove unnecessary leading zeros from the integer part of a numeric string.
   * Always preserves at least one digit and never touches the decimal part.
   *
   * Examples:
   *   '007'    →  '7'
   *   '0042'   →  '42'
   *   '0.5'    →  '0.5'  (leading zero before decimal is correct, don't strip)
   *   '100'    →  '100'  (no leading zero)
   *   '-007'   →  '-7'   (handles negative values)
   */
  private stripLeadingZeros(raw: string): string {
    if (!raw) {
      return raw;
    }

    const isNegative = raw.startsWith('-');
    const absValue = isNegative ? raw.slice(1) : raw;
    const dotPosition = absValue.indexOf('.');
    const integerPart = dotPosition >= 0 ? absValue.slice(0, dotPosition) : absValue;
    const decimalPart = dotPosition >= 0 ? absValue.slice(dotPosition) : '';

    // Replace leading zeros but always keep at least one digit
    const cleanedInteger = integerPart.replace(REGEX.LEADING_ZEROS, '$1') || integerPart;

    return (isNegative ? '-' : '') + cleanedInteger + decimalPart;
  }

  /**
   * Sanitize a pasted string for non-pattern mode.
   * The characters we keep depend on the current mode:
   *
   *   string mode    →  digits only (no dot, no minus; identifiers can't be negative)
   *   integer number →  digits + optional leading minus
   *   decimal number →  digits + optional dot + optional leading minus
   */
  private sanitizePastedText(text: string): string {
    // Normalize decimal comma first (e.g. from a European spreadsheet paste)
    let clean = text.replace(',', '.');

    if (this.effectiveOutputType === 'string') {
      clean = clean.replace(REGEX.ONLY_DIGITS, '');         // string: digits only
    } else if (this.decimalPlaces === 0) {
      clean = clean.replace(REGEX.ONLY_DIGITS_AND_MINUS, ''); // integer: digits + minus
    } else {
      clean = clean.replace(REGEX.ONLY_DIGITS_DOT_AND_MINUS, ''); // decimal: digits + . + minus
    }

    // Remove minus signs unless negative values are permitted
    if (!this.allowNegative || this.effectiveOutputType === 'string') {
      clean = clean.replace(REGEX.ALL_MINUS_SIGNS, '');
    }

    return clean;
  }

  /**
   * Map a cursor position in the formatted DISPLAY string back to an index
   * in the raw digit string.
   *
   * This is needed during paste operations in pattern mode so we know
   * exactly which digit position the cursor is sitting at.
   *
   * Example:
   *   pattern '(000) 000-0000'
   *   display '(555) 867'   cursor at position 8 (after '(555) 86')
   *
   *   Walking the pattern:
   *     '('  pos 0 → sep  (adjusted pos 0, raw index still 0)
   *     '0'  pos 1 → digit (raw index 0)  digit consumed → raw index 1
   *     '0'  pos 2 → digit (raw index 1)  digit consumed → raw index 2
   *     '0'  pos 3 → digit (raw index 2)  digit consumed → raw index 3
   *     ')'  pos 4 → sep
   *     ' '  pos 5 → sep
   *     '0'  pos 6 → digit (raw index 3)  digit consumed → raw index 4
   *     '0'  pos 7 → digit (raw index 4)  digit consumed → raw index 5
   *   We reached position 8, so raw index = 5  ✔
   */
  private mapDisplayCursorToRawIndex(displayCursorPos: number): number {
    if (!this.hasPattern) {
      return displayCursorPos;
    }

    // Adjust for prefix length so we walk the pattern relative to its own start
    const positionInPattern = displayCursorPos - this.prefix.length;
    let rawDigitIndex = 0;
    let patternPosition = 0;

    for (const patternChar of this._resolvedPattern) {
      if (patternPosition >= positionInPattern) {
        break;
      }

      if (patternChar === '0') {
        rawDigitIndex++; // this position consumed a digit
      }

      patternPosition++;
    }

    return rawDigitIndex;
  }

  /**
   * Decide whether a keyboard event is a "control" key that should always
   * be allowed through without interception.
   *
   * Includes:
   *   - Modifier keys held (Ctrl, Meta/Cmd, Alt) — so Ctrl+C, Ctrl+V, etc. work
   *   - Navigation keys (arrows, Home, End)
   *   - Editing keys (Backspace, Delete, Tab, Escape, Enter)
   */
  private isControlKey(event: KeyboardEvent): boolean {
    const isModifierHeld = event.ctrlKey || event.metaKey || event.altKey;

    const isNavigationOrEditKey = [
      'Backspace', 'Delete',
      'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End',
    ].includes(event.key);

    return isModifierHeld || isNavigationOrEditKey;
  }
}
