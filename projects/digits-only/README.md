# ngx-digits-only

A dependency-free, standalone Angular directive for smart numeric inputs — digit filtering, formatting, and validation without pulling in a full masking library like `ngx-mask`.

## What does it do?

Turns any `<input>` into a smart numeric field:

- **Blocks** letters, symbols, and anything that isn't a digit — on every keystroke and paste
- **Formats** the display with thousands separators, prefix, suffix, and pattern masks
- **Strips** all display decoration before sending the value to your model
- **Validates** min, max, maxLength, and pattern completeness automatically
- **Converts** Arabic / Persian digits to Western digits silently

## Installation

```bash
npm install ngx-digits-only
```

## Quick start

This is a **standalone directive** — no module to import, just the directive itself.

```typescript
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DigitsOnlyDirective } from 'ngx-digits-only';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,  // or FormsModule if you use ngModel
    DigitsOnlyDirective,
  ],
  template: `<input digitsOnly formControlName="quantity" />`,
})
export class ExampleComponent {}
```

In an NgModule-based app, standalone directives can be added directly to that module's `imports` array too:

```typescript
@NgModule({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DigitsOnlyDirective,
  ],
  declarations: [MyComponent],
})
export class MyFeatureModule {}
```

## Your first input

```html
<input digitsOnly />
```

That's it. The field now only accepts digits `0–9`. Nothing else gets through.

```html
<input digitsOnly formControlName="quantity" />
<input digitsOnly [(ngModel)]="quantity" name="quantity" />
```

## All inputs at a glance

| Input | Type | Default | What it does |
|---|---|---|---|
| `decimalPlaces` | `number` | `0` | How many decimal digits are allowed |
| `thousandSeparator` | `'' \| ',' \| '.' \| ' ' \| '_'` | `''` | Visual grouping character |
| `prefix` | `string` | `''` | Text shown before the number (e.g. `$`) |
| `suffix` | `string` | `''` | Text shown after the number (e.g. `%`) |
| `allowNegative` | `boolean` | `false` | Allow a leading minus sign |
| `leadingZeros` | `boolean` | `false` | Preserve leading zeros like `007` |
| `maxLength` | `number \| null` | `null` | Max raw digit count |
| `min` | `number \| null` | `null` | Minimum value (validation) |
| `max` | `number \| null` | `null` | Maximum value (validation) |
| `outputType` | `'number' \| 'string'` | `'number'` | Type emitted to the model |
| `pattern` | `NamedPattern \| string` | `''` | Display format mask |
| `convertEasternNumerals` | `boolean` | `true` | Convert Arabic/Persian digits |

## decimalPlaces

Default `0` means integers only.

```html
<input digitsOnly formControlName="quantity" />
<!-- user types: 1234   model: 1234 -->

<input digitsOnly [decimalPlaces]="2" formControlName="price" />
<!-- user types: 99.99   model: 99.99 -->
```

A keystroke that would exceed the allowed decimal places is blocked outright.

## thousandSeparator

Display-only formatting — the model always gets the plain number.

```html
<input digitsOnly thousandSeparator="," formControlName="salary" />
<!-- display: 1,234,567   model: 1234567 -->

<input digitsOnly thousandSeparator="." [decimalPlaces]="2" formControlName="amount" />
<!-- display: 1.234.567,89   model: 1234567.89 -->
<!-- setting "." as the thousands separator auto-switches the decimal char to "," -->
```

Also accepts `' '` (space) and `'_'` (underscore).

## prefix and suffix

```html
<input digitsOnly prefix="$" formControlName="price" />
<!-- display: $1234   model: 1234 -->

<input digitsOnly prefix="€" suffix=" EUR" [decimalPlaces]="2" formControlName="amount" />
<!-- display: €1,234.56 EUR   model: 1234.56 -->
```

Both are stripped before the value reaches your model.

## allowNegative

```html
<input digitsOnly [allowNegative]="true" formControlName="temperature" />
<!-- user can type: -42   model: -42 -->
```

The minus sign is only valid as the first character, and works correctly even with `prefix` set.

## leadingZeros

By default, leading zeros are stripped in number mode.

```html
<input digitsOnly outputType="string" [leadingZeros]="true" [maxLength]="5" formControlName="zip" />
<!-- user types: 01234   model: '01234' (not 1234) -->
```

When `pattern` is set, leading zeros are always preserved automatically.

## maxLength

```html
<input digitsOnly [maxLength]="5" formControlName="pin" />
```

When `pattern` is set, `maxLength` is derived automatically from the number of `0` slots — any manual value is ignored.

## min and max

Only apply in `outputType="number"` mode.

```html
<input digitsOnly [min]="0" [max]="999" formControlName="score" #scoreCtrl="ngModel" />

<p *ngIf="scoreCtrl.errors?.['min']">Minimum value is {{ scoreCtrl.errors?.['min'].min }}</p>
<p *ngIf="scoreCtrl.errors?.['max']">Maximum value is {{ scoreCtrl.errors?.['max'].max }}</p>
```

Error payloads: `{ min: 0, actual: -5 }` / `{ max: 999, actual: 1200 }`.

## outputType — the most important decision

**`outputType="number"` (default)** — model gets a JS `number` or `null`. Use for prices, quantities, anything you'll do arithmetic with.

**`outputType="string"`** — model gets a JS `string` or `null`. Use for card numbers, phone numbers, postal codes, SSNs — identifiers, not quantities.

Why it matters:

- Leading zeros are lost in number mode: `01234` → `1234`
- 16-digit card numbers exceed `Number.MAX_SAFE_INTEGER` (`9007199254740991`) and get silently corrupted if stored as a number

```typescript
// WRONG
cardNumber: number = 4111111111111111; // stored as 4111111111111112 — last digit wrong

// CORRECT
cardNumber: string = '4111111111111111'; // exact
```

## pattern — auto formatting

```html
<input digitsOnly pattern="0000 0000 0000 0000" formControlName="card" />
<!-- display: 4111 1111 1111 1111   model: '4111111111111111' -->
```

Setting `pattern` automatically:

| Effect | Why |
|---|---|
| Forces `outputType="string"` | Patterns are for identifiers, never arithmetic |
| Derives `maxLength` from slot count | No need to set it separately |
| Forces `leadingZeros="true"` | Every digit position is significant |
| Disables `thousandSeparator` | Patterns have their own separators |
| Disables `decimalPlaces` | Patterns are for integers/identifiers |
| Disables `allowNegative` | Identifiers are never negative |

### Named patterns

| Name | Slots | Example |
|---|---|---|
| `card` | 16 | `4111 1111 1111 1111` |
| `card-amex` | 15 | `3782 822463 10005` |
| `expiry` | 4 | `12/26` |
| `cvv` | 3 | `123` |
| `cvv-amex` | 4 | `1234` |
| `phone-us` | 10 | `(555) 867-5309` |
| `ssn` | 9 | `123-45-6789` |
| `date` | 8 | `01/01/1990` |
| `time` | 4 | `09:30` |
| `sort-code` | 6 | `20-00-00` |
| `bsb` | 6 | `062-000` |

```html
<input digitsOnly pattern="card" formControlName="cardNumber" />
<input digitsOnly pattern="expiry" formControlName="expiry" />
<input digitsOnly pattern="ssn" formControlName="ssn" />
```

### Custom patterns

Any string not in the named list is used as a raw pattern — `0` for a digit slot, anything else as a literal separator.

```html
<input digitsOnly pattern="000 000" formControlName="otp" />
<!-- display: 123 456   model: '123456' -->

<input digitsOnly pattern="0000-0000-0000" formControlName="account" />
<!-- display: 1234-5678-9012   model: '123456789012' -->
```

Separators are only inserted once more digits are coming, so you never get a trailing separator mid-type.

## convertEasternNumerals

Arabic and Persian keyboards produce different Unicode digit characters:

| Script | Characters |
|---|---|
| Western | `0 1 2 3 4 5 6 7 8 9` |
| Arabic-Indic | `٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩` |
| Persian/Farsi | `۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹` |

By default (`convertEasternNumerals="true"`), both typing and pasting Eastern digits work transparently, with the Arabic decimal (`٫`) and thousands (`٬`) separators normalized automatically.

```html
<input digitsOnly [convertEasternNumerals]="false" formControlName="code" />
<!-- Eastern digits now blocked — only ASCII 0-9 accepted -->
```

Conversion is unicode-range-safe — it can never accidentally transform a comma, dollar sign, or letter.

## Validation errors

Implements Angular's `Validator` interface — errors land on `control.errors` automatically.

| Error key | When it fires | Payload |
|---|---|---|
| `min` | Value below `[min]` | `{ min, actual }` |
| `max` | Value above `[max]` | `{ max, actual }` |
| `maxLength` | Raw digit count exceeds `[maxLength]` | `{ maxLength, actual }` |
| `patternIncomplete` | Pattern mode, not all slots filled | `{ required, actual, pattern }` |

```html
<input digitsOnly pattern="card" formControlName="cardNumber" />
<p *ngIf="form.get('cardNumber')?.errors?.['patternIncomplete']">
  Enter all {{ form.get('cardNumber')?.errors?.['patternIncomplete']?.required }} digits
</p>
```

Directive errors merge with Angular's own validators (e.g. `Validators.required`) on the same `control.errors` object.

## Reactive Forms example

```typescript
this.form = this.fb.group({
  cardNumber: [null, Validators.required],
  expiry:     [null, Validators.required],
  cvv:        [null, Validators.required],
  amount:     [null, Validators.required],
});
```

```html
<form [formGroup]="form" (ngSubmit)="pay()">
  <input digitsOnly pattern="card" formControlName="cardNumber" placeholder="4111 1111 1111 1111" />
  <input digitsOnly pattern="expiry" formControlName="expiry" placeholder="MM/YY" />
  <input digitsOnly pattern="cvv" formControlName="cvv" placeholder="123" />
  <input digitsOnly [decimalPlaces]="2" thousandSeparator="," prefix="$" [min]="0.01" formControlName="amount" />
  <button type="submit" [disabled]="form.invalid">Pay</button>
</form>
```

```typescript
onSubmit() {
  console.log(this.form.value);
  // {
  //   cardNumber: '4111111111111111',  // string, no spaces
  //   expiry:     '1226',               // string, no slash
  //   cvv:        '123',
  //   amount:     49.99                 // number
  // }
}
```

## Type safety — NamedPattern

```typescript
import { NamedPattern } from 'ngx-digits-only';

export class MyComponent {
  selectedPattern: NamedPattern = 'card'; // autocomplete + compile-time typo checking
  customPattern = '000-0000';              // custom strings still accepted
}
```

```html
<input digitsOnly [pattern]="selectedPattern" formControlName="id" />
```

`NamedPattern` uses the `(string & {})` trick internally so IDE autocomplete for named patterns survives alongside free-form custom pattern strings.

## Standalone Eastern numeral utilities

Zero-dependency functions, usable outside Angular entirely (React, Vue, Node, plain TS):

```typescript
import { convertEasternDigits, hasEasternDigits, getDigitScript, toWesternNumber } from 'ngx-digits-only';

convertEasternDigits('١٢٣');   // '123'
hasEasternDigits('١٢٣');       // true
getDigitScript('۴۵۶');          // 'persian'
toWesternNumber('١٢٣٫٤٥');    // 123.45
```

## Common mistakes

**Using `number` for a card number** — exceeds `Number.MAX_SAFE_INTEGER` and corrupts digits. Use `outputType="string"` or, better, `pattern="card"` which handles it automatically.

**Setting `[maxLength]` alongside `pattern`** — ignored; pattern derives it from slot count.

**Expecting `min`/`max` with `outputType="string"`** — silently ignored in string mode; only works with `outputType="number"`.

**Forgetting `FormsModule`/`ReactiveFormsModule`** — required alongside `DigitsOnlyDirective` for `ngModel`/`formControlName` to work.

## FAQ

**Can I combine `prefix`/`suffix` with `pattern`?** Yes — they wrap the formatted pattern display; the model still gets the raw digits.

**Can I pre-fill from the server?** Yes, via `fb.group()` initial values or `patchValue()` — `writeValue()` formats the display automatically.

**Why `null` instead of `0` for an empty field?** By design, to distinguish "user typed zero" from "user left it blank."

**Does it work with Angular signal-based forms?** Yes — it implements `ControlValueAccessor`, compatible with any Angular form API.

**Can I use it without a form?** Yes:
```html
<input digitsOnly (input)="onInput($event.target.value)" />
```

## Compatibility

Requires Angular `>=16.0.0`.

## License

ISC
