# digitsOnly Directive

A dependency-free Angular directive for digit-only inputs.  
No `npm install`. Copy three files, import, done.

```
digits-only.directive.ts   — the directive itself
digits-only.regex.ts       — every regex used, fully documented
eastern-numerals.ts        — Arabic / Persian digit converter (standalone)
```

---

## Table of Contents

1. [What does it do?](#1-what-does-it-do)
2. [Installation](#2-installation)
3. [Your first input](#3-your-first-input)
4. [All inputs at a glance](#4-all-inputs-at-a-glance)
5. [decimalPlaces](#5-decimalplaces)
6. [thousandSeparator](#6-thousandseparator)
7. [prefix and suffix](#7-prefix-and-suffix)
8. [allowNegative](#8-allownegative)
9. [leadingZeros](#9-leadingzeros)
10. [maxLength](#10-maxlength)
11. [min and max](#11-min-and-max)
12. [outputType — the most important decision](#12-outputtype--the-most-important-decision)
13. [pattern — auto formatting](#13-pattern--auto-formatting)
14. [Named patterns](#14-named-patterns)
15. [Custom patterns](#15-custom-patterns)
16. [convertEasternNumerals](#16-converteasternnumerals)
17. [Validation errors](#17-validation-errors)
18. [NgModel examples](#18-ngmodel-examples)
19. [Reactive FormControl examples](#19-reactive-formcontrol-examples)
20. [Full payment form example](#20-full-payment-form-example)
21. [Type safety — NamedPattern](#21-type-safety--namedpattern)
22. [eastern-numerals.ts standalone usage](#22-eastern-numeralsts-standalone-usage)
23. [Common mistakes](#23-common-mistakes)
24. [FAQ](#24-faq)

---

## 1. What does it do?

It turns any `<input>` into a smart numeric field:

- **Blocks** letters, symbols, and anything that isn't a digit — on every keystroke and paste
- **Formats** the display with thousands separators, prefix, suffix, and pattern masks
- **Strips** all display decoration before sending the value to your model
- **Validates** min, max, maxLength, and pattern completeness automatically
- **Converts** Arabic / Persian digits to Western digits silently

Think of it as a lightweight version of `ngx-mask` focused entirely on numbers and digit identifiers.

---

## 2. Installation

Copy the files into your project under the molecules folder:

```
digits-only/
├── digits-only.directive.ts
├── digits-only.module.ts
├── digits-only.regex.ts
└── eastern-numerals.ts
```

Import `digitsOnlyModule` into your feature module:

```typescript
import { DigitsOnlyDirective } from 'digits-only.directive';

// In a non-standalone NgModule:
@NgModule({
  imports: [
    FormsModule,          // if you use ngModel
    ReactiveFormsModule,  // if you use formControlName
    DigitsOnlyDirective,   // add this — declares and exports DigitsOnlyDirective
  ],
  declarations: [MyComponent],
})
export class MyFeatureModule {}
```

Or if your component is standalone, import the module directly:

```typescript
import { DigitsOnlyDirective } from 'digits-only.directive';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DigitsOnlyDirective,  // imports the module which re-exports the directive
  ],
})
export class MyComponent {}
```

---

## 3. Your first input

Add `digitsOnly` to any `<input>`:

```html
<input digitsOnly />
```

That's it. The field now only accepts digits `0–9`. Nothing else gets through.

With a form control:

```html
<input digitsOnly formControlName="quantity" />
```

With ngModel:

```html
<input digitsOnly [(ngModel)]="quantity" name="quantity" />
```

---

## 4. All inputs at a glance

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

---

## 5. decimalPlaces

Controls how many digits are allowed after the decimal point.  
Default is `0` which means **integers only**.

```html
<!-- integers only (default) -->
<input digitsOnly formControlName="quantity" />
<!-- user types: 1234   model: 1234 -->

<!-- up to 2 decimal places -->
<input digitsOnly [decimalPlaces]="2" formControlName="price" />
<!-- user types: 99.99   model: 99.99 -->

<!-- up to 4 decimal places -->
<input digitsOnly [decimalPlaces]="4" formControlName="rate" />
<!-- user types: 1.0042   model: 1.0042 -->
```

**What happens with extra decimals?**  
If the user tries to type a 3rd decimal digit on a `[decimalPlaces]="2"` field,
that keystroke is blocked. The input never lets bad data through.

---

## 6. thousandSeparator

Inserts a visual grouping character every 3 digits.  
It only affects the **display** — your model always gets the plain number.

```html
<!-- comma separator (US style) -->
<input digitsOnly thousandSeparator="," formControlName="salary" />
<!-- display: 1,234,567   model: 1234567 -->

<!-- dot separator (European style) -->
<input digitsOnly thousandSeparator="." [decimalPlaces]="2" formControlName="amount" />
<!-- display: 1.234.567,89   model: 1234567.89 -->
<!-- note: when thousandSeparator="." the decimal char auto-switches to "," -->

<!-- space separator -->
<input digitsOnly thousandSeparator=" " formControlName="population" />
<!-- display: 1 234 567   model: 1234567 -->

<!-- underscore separator -->
<input digitsOnly thousandSeparator="_" formControlName="value" />
<!-- display: 1_234_567   model: 1234567 -->
```

> **European format tip:** When you set `thousandSeparator="."` the directive
> automatically uses `,` as the decimal character so you get `1.234,56` style
> formatting without any extra configuration.

---

## 7. prefix and suffix

Adds text before or after the number in the **display only**.  
Both are stripped before the value reaches your model.

```html
<!-- dollar prefix -->
<input digitsOnly prefix="$" formControlName="price" />
<!-- display: $1234   model: 1234 -->

<!-- percentage suffix -->
<input digitsOnly suffix="%" formControlName="rate" />
<!-- display: 95%   model: 95 -->

<!-- both at once -->
<input digitsOnly prefix="€" suffix=" EUR" [decimalPlaces]="2" formControlName="amount" />
<!-- display: €1,234.56 EUR   model: 1234.56 -->
```

**In your component:**

```typescript
price: number | null = null;
// When model is 1234, display shows "$1234"
// When display shows "$1,234", model is 1234
```

---

## 8. allowNegative

By default the minus key `-` is blocked. Set `[allowNegative]="true"` to allow it.

```html
<input digitsOnly [allowNegative]="true" formControlName="temperature" />
<!-- user can type: -42   model: -42 -->
```

**Rules:**
- The minus sign is only allowed as the **first character**
- You cannot insert a minus in the middle of the number
- Works correctly even when `prefix` is set — the cursor check accounts for the prefix length

```html
<!-- with prefix — still works correctly -->
<input digitsOnly [allowNegative]="true" prefix="€" [decimalPlaces]="2" formControlName="balance" />
<!-- user types: -1234.56   display: -€1,234.56   model: -1234.56 -->
```

---

## 9. leadingZeros

By default, leading zeros are stripped in number mode.  
Typing `007` gives you model value `7`.

Set `[leadingZeros]="true"` when zeros at the start matter:

```html
<!-- without leadingZeros (default) -->
<input digitsOnly formControlName="count" />
<!-- user types: 007   model: 7 -->

<!-- with leadingZeros -->
<input digitsOnly outputType="string" [leadingZeros]="true" [maxLength]="5" formControlName="zip" />
<!-- user types: 01234   model: '01234' (not 1234) -->
```

> **Note:** When `pattern` is set, leading zeros are **always** preserved automatically
> because every digit slot in a pattern is significant (e.g. a card number starting with `0`).

---

## 10. maxLength

Limits how many raw digits the user can type.  
Trying to type the next digit when the limit is reached does nothing.

```html
<!-- max 5 digits -->
<input digitsOnly [maxLength]="5" formControlName="pin" />
<!-- user cannot type more than 5 digits -->

<!-- max 16 digits — for a card number without pattern -->
<input digitsOnly outputType="string" [leadingZeros]="true" [maxLength]="16" formControlName="card" />
```

> **When `pattern` is set:** `maxLength` is derived automatically from the number
> of `0` slots in the pattern. You do **not** need to set `[maxLength]` separately.
> Any value you set manually will be ignored.

---

## 11. min and max

Adds numeric range validation. These only work in `outputType="number"` mode
(they are ignored for string mode and pattern mode, since identifiers like card
numbers don't have a meaningful numeric range).

```html
<input digitsOnly [min]="1" [max]="100" formControlName="percentage" />
```

When the value is out of range, Angular validation errors are set on the control:

```html
<input digitsOnly [min]="0" [max]="999" formControlName="score" #scoreCtrl="ngModel" />

<p *ngIf="scoreCtrl.errors?.['min']">
  Minimum value is {{ scoreCtrl.errors?.['min'].min }}
</p>
<p *ngIf="scoreCtrl.errors?.['max']">
  Maximum value is {{ scoreCtrl.errors?.['max'].max }}
</p>
```

The error payload:

```typescript
// min error
{ min: 0, actual: -5 }

// max error
{ max: 999, actual: 1200 }
```

---

## 12. outputType — the most important decision

This decides what **type** your model property receives.

### `outputType="number"` (default)

Your model gets a JavaScript **number** or **null**.

```typescript
price: number | null = null;
```

```html
<input digitsOnly formControlName="price" />
<!-- model: 1234 (number) or null (empty) -->
```

Use this for: prices, quantities, temperatures, percentages — anything you will
do arithmetic with.

### `outputType="string"`

Your model gets a JavaScript **string** or **null**.

```typescript
cardNumber: string | null = null;
```

```html
<input digitsOnly outputType="string" formControlName="cardNumber" />
<!-- model: '4111111111111111' (string) or null (empty) -->
```

Use this for: card numbers, phone numbers, postal codes, SSNs, OTP codes —
anything that is an **identifier**, not a quantity.

### Why does this matter?

**Leading zeros are lost as numbers:**

```
user types:   01234
number model: 1234   ← the zero is gone!
string model: '01234' ← preserved correctly
```

**Large numbers lose precision:**

JavaScript has a safe integer limit: `9007199254740991` (about 9 quadrillion).
A 16-digit card number like `4111111111111111` is larger than this limit.
Storing it as a number silently corrupts the last digits:

```typescript
// WRONG — stored as number
cardNumber: number = 4111111111111111;
// JavaScript actually stores: 4111111111111112  ← last digit wrong!

// CORRECT — stored as string
cardNumber: string = '4111111111111111';
// Exact value, no corruption
```

**Simple rule:**

> If you will add, subtract, multiply, or compare the value numerically → use `number`.  
> If the value is an ID, code, or reference → use `string`.

---

## 13. pattern — auto formatting

The `pattern` input lets you define a display format.
Write a string where `0` means "digit slot" and any other character is a separator
that gets inserted automatically as the user types.

```html
<input digitsOnly pattern="0000 0000 0000 0000" formControlName="card" />
```

As the user types `4111111111111111`:

```
After 4 digits:   4111
After 5 digits:   4111 1        ← space inserted automatically
After 8 digits:   4111 1111
After 9 digits:   4111 1111 1   ← space inserted automatically
...
Full:             4111 1111 1111 1111
```

The model **never** sees the spaces:

```
display: 4111 1111 1111 1111
model:   '4111111111111111'
```

**What setting `pattern` does automatically:**

| Effect | Why |
|---|---|
| Forces `outputType="string"` | Patterns are for identifiers, never arithmetic |
| Derives `maxLength` from slot count | No need to set `[maxLength]` separately |
| Forces `leadingZeros="true"` | Every digit position in a pattern is significant |
| Disables `thousandSeparator` | Patterns have their own separators |
| Disables `decimalPlaces` | Patterns are for integers / identifiers |
| Disables `allowNegative` | Identifiers are never negative |

---

## 14. Named patterns

Instead of writing the full pattern string you can use a short name.

| Name | Pattern | Slots | Example display |
|---|---|---|---|
| `card` | `0000 0000 0000 0000` | 16 | `4111 1111 1111 1111` |
| `card-amex` | `0000 000000 00000` | 15 | `3782 822463 10005` |
| `expiry` | `00/00` | 4 | `12/26` |
| `cvv` | `000` | 3 | `123` |
| `cvv-amex` | `0000` | 4 | `1234` |
| `phone-us` | `(000) 000-0000` | 10 | `(555) 867-5309` |
| `ssn` | `000-00-0000` | 9 | `123-45-6789` |
| `date` | `00/00/0000` | 8 | `01/01/1990` |
| `time` | `00:00` | 4 | `09:30` |
| `sort-code` | `00-00-00` | 6 | `20-00-00` |
| `bsb` | `000-000` | 6 | `062-000` |

```html
<!-- card number -->
<input digitsOnly pattern="card" formControlName="cardNumber" />

<!-- expiry date -->
<input digitsOnly pattern="expiry" formControlName="expiry" />

<!-- CVV -->
<input digitsOnly pattern="cvv" formControlName="cvv" />

<!-- US phone -->
<input digitsOnly pattern="phone-us" formControlName="phone" />

<!-- Social Security Number -->
<input digitsOnly pattern="ssn" formControlName="ssn" />
```

Each one produces its model value without separators:

```
pattern="card"     → model: '4111111111111111'
pattern="expiry"   → model: '1226'
pattern="cvv"      → model: '123'
pattern="phone-us" → model: '5558675309'
pattern="ssn"      → model: '123456789'
```

---

## 15. Custom patterns

Any string not in the named list above is used as a raw pattern.
Write `0` for each digit slot and any other character as a separator.

```html
<!-- OTP: 6 digits split into two groups of 3 -->
<input digitsOnly pattern="000 000" formControlName="otp" />
<!-- display: 123 456   model: '123456' -->

<!-- bank account: 12 digits in groups of 4 -->
<input digitsOnly pattern="0000-0000-0000" formControlName="account" />
<!-- display: 1234-5678-9012   model: '123456789012' -->

<!-- license plate digits -->
<input digitsOnly pattern="000-0000" formControlName="plate" />
<!-- display: 123-4567   model: '1234567' -->

<!-- custom date with dots -->
<input digitsOnly pattern="00.00.0000" formControlName="dob" />
<!-- display: 01.01.1990   model: '01011990' -->
```

**How the separator algorithm works:**

The directive walks the pattern character by character. When it hits a `0` it
places the next typed digit. When it hits any other character it inserts that
separator — but **only if more digits are still coming**. This prevents a
trailing separator appearing mid-type.

```
pattern = "0000 0000"

User has typed 4 digits: display is "4111"
User types 5th digit:    display becomes "4111 1"  ← space appears NOW
User types 6th digit:    display becomes "4111 11"
...
```

---

## 16. convertEasternNumerals

Arabic and Persian keyboards produce different Unicode characters for digits:

| Script | Characters | Unicode |
|---|---|---|
| Western (what JS expects) | `0 1 2 3 4 5 6 7 8 9` | U+0030–U+0039 |
| Arabic-Indic | `٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩` | U+0660–U+0669 |
| Persian / Farsi | `۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹` | U+06F0–U+06F9 |

Without conversion, a user typing `١٢٣` on an Arabic keyboard would be blocked
entirely because `١` does not match `/^\d$/`.

**Default behaviour (`convertEasternNumerals="true"`):**

Both keyboard typing and pasting of Eastern digits work:

```html
<input digitsOnly formControlName="amount" />
<!-- user types ١٢٣  →  display: 123  →  model: 123 -->
<!-- user types ۴۵۶  →  display: 456  →  model: 456 -->
<!-- user pastes ١٬٢٣٤٫٥٦  →  display: 1,234.56  →  model: 1234.56 -->
```

Also normalised automatically:
- Arabic decimal separator `٫` (U+066B) → `.`
- Arabic thousands separator `٬` (U+066C) → removed

**Opting out:**

```html
<input digitsOnly [convertEasternNumerals]="false" formControlName="code" />
<!-- typing ١ or ۶ is now blocked — only ASCII 0-9 accepted -->
```

**This is completely safe.** The Arabic and Persian digit Unicode ranges have
zero overlap with ASCII. Converting `٥` to `'5'` can never accidentally
transform a comma, dollar sign, letter, or any other character.

---

## 17. Validation errors

The directive implements Angular's `Validator` interface. Errors appear on your
`AbstractControl` automatically — no extra setup needed.

| Error key | When it fires | Payload |
|---|---|---|
| `min` | Value is below `[min]` | `{ min: number, actual: number }` |
| `max` | Value is above `[max]` | `{ max: number, actual: number }` |
| `maxLength` | Raw digit count exceeds `[maxLength]` | `{ maxLength: number, actual: number }` |
| `patternIncomplete` | Pattern mode: not all slots filled | `{ required: number, actual: number, pattern: string }` |

### Showing errors in the template

**With ngModel:**

```html
<input
  digitsOnly
  [min]="0"
  [max]="100"
  [(ngModel)]="score"
  name="score"
  #scoreRef="ngModel"
/>
<p *ngIf="scoreRef.errors?.['min']">Too low — minimum is {{ scoreRef.errors?.['min'].min }}</p>
<p *ngIf="scoreRef.errors?.['max']">Too high — maximum is {{ scoreRef.errors?.['max'].max }}</p>
```

**With reactive forms:**

```html
<input digitsOnly pattern="card" formControlName="cardNumber" />
<p *ngIf="form.get('cardNumber')?.touched && form.get('cardNumber')?.errors?.['patternIncomplete']">
  Please enter all
  {{ form.get('cardNumber')?.errors?.['patternIncomplete']?.required }} digits
  ({{ form.get('cardNumber')?.errors?.['patternIncomplete']?.actual }} entered so far)
</p>
```

**Combining with Angular built-in validators:**

The directive errors and Angular errors both land on the same `control.errors`
object — they merge together:

```typescript
this.form = this.fb.group({
  price: [null, Validators.required],  // required from Angular
  // min / max / maxLength come from the directive inputs
});
```

```html
<input digitsOnly [min]="0" [max]="999" formControlName="price" />
<p *ngIf="ctrl('price').touched && ctrl('price').errors?.['required']">Required</p>
<p *ngIf="ctrl('price').errors?.['min']">Must be at least 0</p>
<p *ngIf="ctrl('price').errors?.['max']">Must be at most 999</p>
```

---

## 18. NgModel examples

### Basic integer

```html
<input digitsOnly [(ngModel)]="quantity" name="quantity" />
```

```typescript
quantity: number | null = null;
```

### Currency with thousands

```html
<input
  digitsOnly
  thousandSeparator=","
  prefix="$"
  [decimalPlaces]="2"
  [(ngModel)]="price"
  name="price"
/>
```

```typescript
price: number | null = null;
// display: $1,234.56   model: 1234.56
```

### Negative balance

```html
<input
  digitsOnly
  [allowNegative]="true"
  [decimalPlaces]="2"
  thousandSeparator=","
  prefix="€"
  [min]="-99999"
  [max]="99999"
  [(ngModel)]="balance"
  name="balance"
  #balanceRef="ngModel"
/>
<p *ngIf="balanceRef.errors?.['min']">Too low</p>
<p *ngIf="balanceRef.errors?.['max']">Too high</p>
```

```typescript
balance: number | null = null;
```

### Postal code (string, leading zeros)

```html
<input
  digitsOnly
  outputType="string"
  [leadingZeros]="true"
  [maxLength]="5"
  [(ngModel)]="postalCode"
  name="postalCode"
  required
/>
```

```typescript
postalCode: string | null = null;
// user types 01234 → model: '01234'  (NOT 1234)
```

### Card number with pattern

```html
<input
  digitsOnly
  pattern="card"
  [(ngModel)]="cardNumber"
  name="cardNumber"
/>
```

```typescript
cardNumber: string | null = null;
// display: 4111 1111 1111 1111   model: '4111111111111111'
```

---

## 19. Reactive FormControl examples

### Setting up the form

```typescript
import { FormBuilder, Validators } from '@angular/forms';

export class MyComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      salary:     [null, Validators.required],
      price:      [null],
      balance:    [-1234.56],          // pre-filled — writeValue fires immediately
      cardNumber: [null, Validators.required],
      expiry:     [null, Validators.required],
      cvv:        [null, Validators.required],
      postalCode: [null, Validators.required],
    });
  }
}
```

### Template

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">

  <!-- integer, $ prefix, comma thousands -->
  <input
    digitsOnly
    thousandSeparator=","
    prefix="$"
    formControlName="salary"
  />

  <!-- 2 decimals, $ prefix -->
  <input
    digitsOnly
    [decimalPlaces]="2"
    thousandSeparator=","
    prefix="$"
    formControlName="price"
  />

  <!-- pre-filled negative value — shows -€1,234.56 immediately -->
  <input
    digitsOnly
    [allowNegative]="true"
    [decimalPlaces]="2"
    thousandSeparator=","
    prefix="€"
    formControlName="balance"
  />

  <!-- card number — spaces in display, raw digits in model -->
  <input
    digitsOnly
    pattern="card"
    formControlName="cardNumber"
  />
  <p *ngIf="form.get('cardNumber')?.touched && form.get('cardNumber')?.errors?.['required']">
    Card number is required
  </p>
  <p *ngIf="form.get('cardNumber')?.errors?.['patternIncomplete']">
    Enter all 16 digits
  </p>

  <!-- expiry -->
  <input digitsOnly pattern="expiry" formControlName="expiry" />

  <!-- CVV -->
  <input digitsOnly pattern="cvv" formControlName="cvv" />

  <!-- postal code — string output, leading zeros -->
  <input
    digitsOnly
    outputType="string"
    [leadingZeros]="true"
    [maxLength]="5"
    formControlName="postalCode"
  />

  <button type="submit">Submit</button>
</form>
```

### Reading the submitted value

```typescript
onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  console.log(this.form.value);
  // {
  //   salary:     85000,               ← number
  //   price:      1299.99,             ← number
  //   balance:    -1234.56,            ← number
  //   cardNumber: '4111111111111111',  ← string (no spaces)
  //   expiry:     '1226',             ← string (no slash)
  //   cvv:        '123',              ← string
  //   postalCode: '01234',            ← string (leading zero kept)
  // }
}
```

---

## 20. Full payment form example

A complete working example with every common payment field:

**Component:**

```typescript
@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DigitsOnlyDirective],
  templateUrl: './payment.component.html',
})
export class PaymentComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      cardNumber: [null, Validators.required],   // string  '4111111111111111'
      expiry:     [null, Validators.required],   // string  '1226'
      cvv:        [null, Validators.required],   // string  '123'
      amount:     [null, Validators.required],   // number  49.99
    });
  }

  get cardCtrl() { return this.form.get('cardNumber')!; }
  get expiryCtrl() { return this.form.get('expiry')!; }
  get cvvCtrl() { return this.form.get('cvv')!; }
  get amountCtrl() { return this.form.get('amount')!; }

  pay() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    console.log(this.form.value);
  }
}
```

**Template:**

```html
<form [formGroup]="form" (ngSubmit)="pay()">

  <label>Card number</label>
  <input digitsOnly pattern="card" formControlName="cardNumber" placeholder="4111 1111 1111 1111" />
  <p *ngIf="cardCtrl.touched && cardCtrl.errors?.['required']">Required</p>
  <p *ngIf="cardCtrl.errors?.['patternIncomplete']">Enter all 16 digits</p>

  <label>Expiry</label>
  <input digitsOnly pattern="expiry" formControlName="expiry" placeholder="MM/YY" />
  <p *ngIf="expiryCtrl.touched && expiryCtrl.errors?.['required']">Required</p>
  <p *ngIf="expiryCtrl.errors?.['patternIncomplete']">Enter MM and YY</p>

  <label>CVV</label>
  <input digitsOnly pattern="cvv" formControlName="cvv" placeholder="123" />
  <p *ngIf="cvvCtrl.touched && cvvCtrl.errors?.['required']">Required</p>

  <label>Amount</label>
  <input
    digitsOnly
    [decimalPlaces]="2"
    thousandSeparator=","
    prefix="$"
    [min]="0.01"
    formControlName="amount"
    placeholder="0.00"
  />
  <p *ngIf="amountCtrl.touched && amountCtrl.errors?.['required']">Required</p>
  <p *ngIf="amountCtrl.errors?.['min']">Must be greater than 0</p>

  <button type="submit" [disabled]="form.invalid">Pay</button>

</form>
```

---

## 21. Type safety — NamedPattern

The `pattern` input is typed as `NamedPattern | (string & {})`.

`NamedPattern` is a union of all valid named aliases:

```typescript
export type NamedPattern =
  | 'card' | 'card-amex' | 'expiry' | 'cvv' | 'cvv-amex'
  | 'phone-us' | 'ssn' | 'date' | 'time' | 'sort-code' | 'bsb';
```

### What this gives you

**Autocomplete in your IDE:**

```typescript
// Your IDE suggests all valid names as you type
myPattern: NamedPattern = 'ca...';
//                         ↑ suggests 'card', 'card-amex'
```

**Compile-time error on typos:**

```typescript
myPattern: NamedPattern = 'crad';
//                        ^^^^^ TypeScript error — 'crad' is not a NamedPattern
```

**Custom patterns still work:**

```typescript
// (string & {}) allows any string without collapsing the literal suggestions
myPattern = '000-0000';  // ✔ no error
```

### Why `(string & {})` and not just `string`

```typescript
// BAD — collapses to string, autocomplete disappears
@Input() pattern: NamedPattern | string

// GOOD — keeps autocomplete alive while still accepting custom strings
@Input() pattern: NamedPattern | (string & {})
```

TypeScript treats `NamedPattern | string` as just `string` (because `string`
contains all literals). The `& {}` intersection creates a type that is
technically different at the compiler level, keeping the named suggestions
visible in your IDE while accepting any string at runtime.

### Using it in your component

```typescript
import { NamedPattern } from 'digits-only.directive';

export class MyComponent {
  // Typed — autocomplete works, typos caught at compile time
  selectedPattern: NamedPattern = 'card';

  // Also fine — custom patterns accepted
  customPattern = '000-0000';
}
```

```html
<input digitsOnly [pattern]="selectedPattern" formControlName="id" />
```

---

## 22. eastern-numerals.ts standalone usage

The `eastern-numerals.ts` file has **zero imports**. Copy it into any project —
Angular, React, Vue, Node.js, plain TypeScript — and use it directly.

### `convertEasternDigits(input)`

Converts all Eastern digits to Western. Returns a string.

```typescript
import { convertEasternDigits } from 'digits-only/eastern-numerals';

convertEasternDigits('١٢٣')          // '123'
convertEasternDigits('۶۷۸')          // '678'
convertEasternDigits('١٢٣٫٤٥')      // '123.45'   (decimal comma converted)
convertEasternDigits('١٬٢٣٤')       // '1234'     (thousands sep stripped)
convertEasternDigits('price: ١٠٠')  // 'price: 100'  (non-digits untouched)
convertEasternDigits('123')           // '123'      (already Western, no change)
convertEasternDigits(null)            // ''
convertEasternDigits(42)              // '42'       (number input accepted)
```

### `hasEasternDigits(input)`

Quick check — returns `true` if any Eastern digit is present.

```typescript
hasEasternDigits('١٢٣')    // true
hasEasternDigits('123')     // false
hasEasternDigits('hello')   // false
```

### `getDigitScript(input)`

Returns which script the digits are in.

```typescript
getDigitScript('١٢٣')   // 'arabic'
getDigitScript('۴۵۶')  // 'persian'
getDigitScript('123')   // 'western'
getDigitScript('١23')   // 'mixed'   (Arabic + Western together)
```

### `toWesternNumber(input)`

Converts Eastern digits and then parses as a JavaScript number.

```typescript
toWesternNumber('١٢٣')       // 123
toWesternNumber('١٢٣٫٤٥')   // 123.45
toWesternNumber('abc')        // NaN
```

---

## 23. Common mistakes

### Mistake 1 — using `number` for a card number

```html
<!-- WRONG — card number stored as number -->
<input digitsOnly [maxLength]="16" formControlName="cardNumber" />

<!-- CORRECT — card number stored as string -->
<input digitsOnly outputType="string" [leadingZeros]="true" [maxLength]="16" formControlName="cardNumber" />

<!-- EVEN BETTER — use the pattern which handles everything automatically -->
<input digitsOnly pattern="card" formControlName="cardNumber" />
```

Card numbers are 16 digits and exceed `Number.MAX_SAFE_INTEGER`. Storing as a
number silently corrupts the last digits.

### Mistake 2 — setting `[maxLength]` when using a pattern

```html
<!-- WRONG — maxLength is ignored when pattern is set -->
<input digitsOnly pattern="card" [maxLength]="16" formControlName="cardNumber" />

<!-- CORRECT — pattern derives maxLength automatically -->
<input digitsOnly pattern="card" formControlName="cardNumber" />
```

### Mistake 3 — expecting `min`/`max` to work with `outputType="string"`

```html
<!-- min/max are silently ignored in string mode -->
<input digitsOnly outputType="string" [min]="0" [max]="100" formControlName="code" />

<!-- min/max only work in number mode -->
<input digitsOnly outputType="number" [min]="0" [max]="100" formControlName="score" />
```

### Mistake 4 — forgetting `FormsModule` for ngModel

```typescript
// WRONG — missing FormsModule
@Component({
  imports: [DigitsOnlyDirective],
})

// CORRECT
@Component({
  imports: [FormsModule, DigitsOnlyDirective],
})
```

### Mistake 5 — using European format without understanding the decimal switch

```html
<!-- thousandSeparator="." automatically switches decimal char to "," -->
<input digitsOnly thousandSeparator="." [decimalPlaces]="2" formControlName="amount" />

<!-- user types: 1234,56 (using comma as decimal on European keyboard) -->
<!-- display:    1.234,56 -->
<!-- model:      1234.56  ← always a dot internally -->
```

---

## 24. FAQ

**Can I use `prefix`/`suffix` and `pattern` together?**

Yes. `prefix` and `suffix` wrap the entire formatted display. With `pattern="card"`
and `prefix="Card: "` the display shows `Card: 4111 1111 1111 1111`. The model
still receives `'4111111111111111'`.

**Can I pre-fill a value from the server?**

Yes. Set the initial value in `fb.group()` or via `form.patchValue()`. The
directive's `writeValue()` fires automatically and formats the display correctly.

```typescript
this.form = this.fb.group({ pnl: [-1234.56] });
// input immediately displays: -€1,234.56
```

**Does `Validators.required` still work?**

Yes. Add it to `fb.group()` or your `ngModel` declaration. It works alongside
the directive's own validators — all errors merge into `control.errors`.

**Can I change the pattern dynamically?**

Yes. Bind it with `[pattern]`:

```html
<input digitsOnly [pattern]="isAmex ? 'card-amex' : 'card'" formControlName="card" />
```

**Why is my value `null` instead of `0` when the field is empty?**

By design — an empty field returns `null`, not `0`. This makes it easy to tell
the difference between "the user typed zero" and "the user left it blank". Check
for `null` in your validation, not for falsy values.

**Does it work with Angular signals?**

Yes. The directive implements `ControlValueAccessor` which works with any Angular
form API including signal-based forms in Angular 17+.

**Can I use it without a form at all?**

Yes — just listen to the native `input` event:

```html
<input digitsOnly (input)="onInput($event.target.value)" />
```

The directive still blocks bad keystrokes and formats the display. The model
binding is optional.
