# ngx-digits-only

Dependency-free Angular directive for numeric-only inputs — a lightweight alternative to `ngx-mask` when all you need is digit filtering and formatting.

## Features

- Restricts input to digits only, with optional decimal and negative number support
- Thousands separator formatting (configurable)
- Prefix / suffix support (e.g. currency symbols, units)
- Configurable decimal places
- Min / max value validation
- Persian / Arabic (Eastern) numeral conversion and display
- Full RTL / LTR layout support
- Implements `ControlValueAccessor` and `Validator` — works natively with Reactive Forms and Template-driven forms
- Standalone directive — no NgModule required
- Zero runtime dependencies

## Installation

```bash
npm install ngx-digits-only
```

## Usage

Import the directive directly into your standalone component:

```typescript
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxDigitsOnlyDirective } from 'ngx-digits-only';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [ReactiveFormsModule, NgxDigitsOnlyDirective],
  template: `
    <input
      ngxDigitsOnly
      [allowDecimal]="true"
      [decimalPlaces]="2"
      [allowNegative]="false"
      [thousandsSeparator]="true"
      [min]="0"
      [max]="1000000"
      [formControl]="amountControl"
    />
  `
})
export class ExampleComponent {
  amountControl = new FormControl('');
}
```

### In an NgModule-based app

Standalone directives can still be used inside NgModule-based components — just add it to that component's own `imports` array if the component itself is standalone, or import it directly where the input lives:

```typescript
@Component({
  standalone: true,
  imports: [NgxDigitsOnlyDirective],
  ...
})
```

If your component is *not* standalone (declared in an `NgModule`), you can import the directive into that NgModule's `imports` array directly — standalone directives are valid entries there too.

## API

| Input | Type | Default | Description |
|---|---|---|---|
| `allowDecimal` | `boolean` | `false` | Allow decimal point input |
| `decimalPlaces` | `number` | `2` | Max digits after decimal point |
| `allowNegative` | `boolean` | `false` | Allow leading minus sign |
| `thousandsSeparator` | `boolean` | `false` | Format with thousands separators as user types |
| `prefix` | `string` | `''` | Text prepended to the display value |
| `suffix` | `string` | `''` | Text appended to the display value |
| `min` | `number` | `undefined` | Minimum allowed value (adds validator) |
| `max` | `number` | `undefined` | Maximum allowed value (adds validator) |
| `easternNumerals` | `boolean` | `false` | Display Persian/Arabic-Indic digits instead of Western |

## Compatibility

Requires Angular `>=16.0.0` (standalone APIs). Works in both standalone and NgModule-based applications.

## License

ISC
