# AGENTS.md — Maintainer Knowledge for Âm Lịch Việt Nam

## Project Overview

A Vietnamese lunar calendar (Âm Lịch) web page. Pure static site — runs on
GitHub Pages with no server, no build step, no dependencies. Open `index.html`
in a browser (must be served over HTTP due to ES module imports; `file://` won't
work due to CORS).

## File Structure

```
amlich/
  index.html          Semantic HTML + thin JS imperative shell (ES module)
  style.css           All presentation — light/dark themes, responsive, a11y focus
  amlich.js           Pure functional core — all calendar logic (ES module)
  amlich.test.js      100 tests using Node.js built-in test runner
  AGENTS.md           This file
```

## Architecture: Functional Core + Imperative Shell

Separation of concerns across three files:

- **`amlich.js`** — pure functions only (no DOM, no `Date()`, no shared mutable
  state). All calendar math, Can Chi, formatting, and data generation.
- **`style.css`** — all visual presentation. Uses CSS custom properties for
  theming (light/dark). No style in HTML or JS.
- **`index.html`** — semantic HTML structure + a thin `<script type="module">`
  that imports `calendarMonthData` and `dateDetailData`, maps data to the DOM.

**Rules:**
- Never put computation in `index.html`. Never put DOM access in `amlich.js`.
- Never put inline styles in HTML or JS. All colors/spacing go through CSS
  variables in `style.css`.
- If you need new calendar logic, add it to `amlich.js`, export it, test it,
  then consume it from the HTML module script.

The shell holds exactly three pieces of mutable state: `currentMonth`,
`currentYear`, `selectedDate`. Navigation functions mutate these then call
`render()`.

## Algorithm

The solar-to-lunar conversion is based on Hồ Ngọc Đức's algorithm:
https://www.informatik.uni-leipzig.de/~duc/amlich/

The pipeline is:

1. **Julian Day Number (JD)** — `jdFromDate(dd, mm, yy)` converts a Gregorian
   date to an integer JD. Handles the Gregorian reform boundary at JD 2299161
   (Oct 15, 1582). `jdToDate(jd)` is the inverse.

2. **New Moon** — `newMoon(k)` computes the JD of the k-th new moon from a
   reference epoch (Jan 1900). Uses Chapront's series expansion for lunar
   anomaly, solar anomaly, and node longitude. `newMoonDay(k, tz)` truncates
   to an integer day in the given timezone.

3. **Sun Longitude** — `sunLongitude(jdn)` returns the ecliptic longitude of
   the sun (radians, 0 = vernal equinox) for a given JD. Uses a low-precision
   formula adequate for calendar determination.

4. **Sun Longitude Sector** — Two versions:
   - `sunLongitudeSector(jd, tz)` → 0–11 (30° sectors). Used **only** in the
     leap month algorithm (`lunarMonth11`, `leapMonthOffset`). Do not change
     this to 24 sectors — it will break leap month detection.
   - `solarTermIndex(jd, tz)` → 0–23 (15° sectors). Used **only** for display
     of the 24 tiết khí (solar terms).

5. **Lunar Month 11** — `lunarMonth11(yy, tz)` finds the new moon day that
   starts lunar month 11 of year `yy`. Month 11 is defined as the lunar month
   containing the winter solstice (sun longitude ≥ 270°, sector ≥ 9).

6. **Leap Month Offset** — `leapMonthOffset(a11, tz)` counts forward from the
   month-11 new moon to find the first month where two consecutive new moons
   fall in the same 30° sun-longitude sector. That month is the leap month.

7. **Solar to Lunar** — `solarToLunar(dd, mm, yy, tz)` returns
   `[lunarDay, lunarMonth, lunarYear, lunarLeap]`. `lunarLeap` is 1 if the
   date falls in a leap month, 0 otherwise.

### Timezone

All functions that depend on the observer's timezone accept a `timeZone`
parameter (hours offset from UTC). Vietnam uses `TZ = 7` (UTC+7). This is
hardcoded in the UI shell, not in the core.

## Can Chi (Heavenly Stems & Earthly Branches)

The Vietnamese calendar uses the Chinese sexagenary cycle:

- **10 Thiên Can (Heavenly Stems):** Giáp, Ất, Bính, Đinh, Mậu, Kỷ, Canh,
  Tân, Nhâm, Quý
- **12 Địa Chi (Earthly Branches):** Tý, Sửu, Dần, Mão, Thìn, Tỵ, Ngọ, Mùi,
  Thân, Dậu, Tuất, Hợi

The system has three independent cycles:

### Can Chi Year — `canChiYear(year)`

- `CAN[(year + 6) % 10]` + `CHI[(year + 8) % 12]`
- 60-year cycle. 2024 = Giáp Thìn (Dragon).
- The offset constants (6, 8) calibrate to the historical epoch.

### Can Chi Month — `canChiMonth(month, year)`

- Chi is fixed: month 1 always = Dần, month 2 = Mão, ..., month 12 = Sửu.
  Formula: `CHI[(month + 1) % 12]`.
- Can depends on the year's Can: `canStart = (canYearIdx % 5) * 2 + 2`.
  This encodes the rule: Giáp/Kỷ year → month 1 starts Bính; Ất/Canh → Mậu;
  Bính/Tân → Canh; Đinh/Nhâm → Nhâm; Mậu/Quý → Giáp.
- **Note:** `month` here is the **lunar** month number (1–12), and `year` is
  the **lunar** year.

### Can Chi Day — `canChiDay(dd, mm, yy)`

- Based on Julian Day Number: `CAN[(jd + 9) % 10]` + `CHI[(jd + 1) % 12]`.
- 60-day cycle, independent of month/year.
- The offsets (9, 1) calibrate to the epoch (JD 0 = Giáp Tý).

### Animal Year — `animalYear(year)`

- `CHI_ANIMAL[(year + 8) % 12]` — same Earthly Branch index as the year.
- Vietnamese zodiac uses **Mèo (Cat)** instead of Chinese Rabbit (Thỏ).

## Day of Week

`dayOfWeek(dd, mm, yy)` returns 0=Sunday, 1=Monday, ..., 6=Saturday.

Formula: `(jdFromDate(dd, mm, yy) + 1) % 7`.

**The +1 shift is critical.** Raw `JD % 7` gives 0=Monday (Julian Day
convention where JD 0 is Monday). The `+1` converts to 0=Sunday to match the
`THU[]` array and the calendar grid columns (CN, T2, T3, T4, T5, T6, T7).

## Solar Terms (Tiết Khí)

The `TIET_KHI` array holds 24 solar terms indexed by 15-degree ecliptic
longitude sectors starting from the vernal equinox:

```
Index  Degrees  Name         English
 0       0°     Xuân phân    Vernal equinox
 6      90°     Hạ chí       Summer solstice
12     180°     Thu phân     Autumnal equinox
18     270°     Đông chí     Winter solstice
```

`solarTermIndex(jd, tz)` divides the ecliptic into 24 sectors of 15° each.
`solarTerm(jd, tz)` returns the Vietnamese name.

**Known precision limitation:** the sun longitude is computed at midnight local
time. On the exact day of a solstice/equinox, the result depends on whether
the event occurs before or after local midnight. This is inherent to the
algorithm and acceptable for a calendar display.

## Data Generation Functions

### `calendarMonthData(mm, yy, tz)` → Array of cell objects

Returns an array for rendering a month grid. Leading entries have
`{ empty: true }` for padding. Date entries have:

```js
{
  day, dow, lunarDay, lunarMonth, lunarYear, lunarLeap (boolean),
  lunarLabel (string), isFirstLunarDay, isSunday, isSaturday
}
```

### `dateDetailData(dd, mm, yy, tz)` → Object

Returns all displayable info for a single date:

```js
{
  solar: { day, month, year },
  lunar: { day, month, year, leap (boolean) },
  dayOfWeek, dayOfWeekName,
  canChiYear, animalYear, canChiMonth, canChiDay,
  solarTerm, lunarMonthName
}
```

## Testing

Run tests: `node --test amlich.test.js`

Uses Node.js built-in `node:test` runner (requires Node 18+). No npm
dependencies.

### Test categories (100 tests, 24 suites):

1. **JD conversion** — known epochs (J2000, Unix), Gregorian reform boundary,
   roundtrip for 8 dates.
2. **Solar-to-lunar** — 7 verified Tết dates (2020–2026), Mid-Autumn 2024,
   year boundary crossing, leap month boundaries (2020 leap-4, 2025 leap-6).
3. **Invariant sweeps** — every day of 2024 and 2025 checked for valid ranges;
   consecutive lunar day monotonicity across all of 2024.
4. **Can Chi** — year names for 7 dates, 60-year cycle; month Chi sequence;
   day cycle and consecutive uniqueness.
5. **Day of week** — 6 known dates verified against calendar.
6. **Solar terms** — summer/winter solstice, 0–23 range, valid name lookup.
7. **Helpers** — leap year (including century rules), days-in-month.
8. **Formatting** — lunarMonthName, lunarDateLabel (padding, leap prefix).
9. **Data generation** — calendarMonthData structure, field presence,
   sequentiality, Sunday/Saturday flags, leap month cells; dateDetailData
   completeness.

### Adding new Tết dates for future years

To verify a new Tết date, add an entry to the `tetDates` array in the test.
The solar date of Tết can be confirmed via Vietnamese government announcements
or astronomical tables. The lunar date is always 1/1.

### Verifying leap months

Leap months occur roughly every 2–3 years. When adding test coverage for a new
leap year, find the solar date range of the leap month by scanning:

```js
for (let d = 1; d <= daysInSolarMonth(m, y); d++) {
  const r = solarToLunar(d, m, y, 7);
  if (r[3]) console.log(`${d}/${m}/${y}`, r);
}
```

## Known Pitfalls and Past Bugs

### 1. Two sun-longitude functions — do not unify

`sunLongitudeSector` (12 segments) is used **only** by `lunarMonth11` and
`leapMonthOffset`. `solarTermIndex` (24 segments) is used **only** for display.
If you change `sunLongitudeSector` to 24 segments, the leap month algorithm
will break because it relies on 30-degree sectors to detect months where the
sun doesn't cross a major term boundary.

### 2. Day-of-week offset

Julian Day 0 is a Monday. Raw `jd % 7` gives 0=Monday, not 0=Sunday. The
`dayOfWeek` function applies `(jd + 1) % 7` to align with the THU[] array
(0=Sunday). If you ever change THU[] indexing or the grid column order, this
offset must change too.

### 3. Lunar year ≠ solar year

Near January, the lunar year can lag behind the solar year. For example,
Jan 1, 2025 (solar) is still in lunar year 2024 (Giáp Thìn). The
`solarToLunar` function handles this. When displaying, always use the
`lunarYear` from the conversion, not the solar year.

### 4. Leap month semantics

`solarToLunar` returns `lunarLeap = 1` when the date is in a leap month. The
leap month has the **same number** as the preceding regular month. For example,
2025 has leap month 6: after regular tháng Sáu, there's a nhuận tháng Sáu.
Both report `lunarMonth = 6`, but `lunarLeap` distinguishes them.

### 5. ES module CORS

`index.html` uses `<script type="module">` which requires HTTP serving. Opening
via `file://` will fail. For local development: `python3 -m http.server` or any
static file server. On GitHub Pages this is not an issue.

### 6. Navigation uses event delegation

Navigation buttons use `data-action` attributes (e.g., `data-action="prev-month"`)
and a single `click` listener on the `.nav` container dispatches by action name.
No inline `onclick` handlers, no `window.*` globals. To add a new nav action,
add a `<button data-action="...">` in the HTML and handle the action string in
the delegation listener.

### 7. Calendar cells are `<button>` elements

For keyboard accessibility, calendar cells are `<button type="button">` not
`<div>`. They use ARIA attributes: `aria-current="date"` for today,
`aria-pressed="true"` for the selected date, `aria-disabled="true"` for empty
padding cells, and `aria-label` with the solar/lunar date for screen readers.
The CSS resets button appearance via `appearance: none` on `.cal-cell`.

## Telegram Mini App

The app is compatible as a Telegram Mini App. It works both as a standalone
web page and inside Telegram — detection is automatic via `Telegram.WebApp.initData`.

### How it works

1. The Telegram Web App SDK (`telegram-web-app.js`) is loaded in `<head>`.
   Outside Telegram, the SDK is inert (no `initData`), so nothing changes.
2. On load, `initTelegram()` checks for `window.Telegram.WebApp.initData`.
   If present, it:
   - Adds class `tg` to `<html>` (used by CSS to hide the header, adjust
     spacing, and restyle the today button)
   - Calls `tg.ready()` (signals the app is loaded to Telegram)
   - Calls `tg.expand()` (expands to full viewport height)
   - Reads `tg.themeParams` and overrides CSS custom properties so the
     calendar matches the user's Telegram theme
   - Listens for `themeChanged` and re-applies

### Theme mapping

Telegram theme params are mapped to CSS variables by `applyTgTheme()`:

| Telegram param         | CSS variable   | Notes                          |
|------------------------|----------------|--------------------------------|
| `bg_color`             | `--bg`         |                                |
| `secondary_bg_color`   | `--card`       | Falls back to `section_bg_color` then `bg_color` |
| `text_color`           | `--text`       |                                |
| `hint_color`           | `--muted`      |                                |
| `hint_color` @ 30%     | `--border`     | Derived via `rgba()`           |
| `secondary_bg_color`   | `--hover`      |                                |
| `button_color`         | `--tg-btn-bg`  | Only the "Hôm nay" button      |
| `button_text_color`    | `--tg-btn-text`|                                |

The Vietnamese accent colors (`--red`, `--gold`) are **not** overridden —
they preserve the calendar's cultural identity inside Telegram.

### CSS `.tg` class

When inside Telegram, `<html class="tg">` enables:
- `header { display: none }` — Telegram already shows the app name
- Reduced top padding
- "Hôm nay" button uses Telegram's `button_color` / `button_text_color`

### Setting up the bot

1. Message `@BotFather` on Telegram
2. `/newbot` → create your bot
3. `/newapp` → select your bot → enter the GitHub Pages URL
   (e.g., `https://username.github.io/amlich/`)
4. Users can open the Mini App via the bot menu button or a direct link:
   `https://t.me/your_bot/amlich`

### Safe areas

The CSS uses `env(safe-area-inset-*)` on `.container` for notched phones.
The `<meta name="viewport">` includes `viewport-fit=cover` so the app
extends behind the notch and applies its own inset padding.

## Deployment

### GitHub Pages

Push to GitHub and enable GitHub Pages (Settings → Pages → Branch: main).
No build step required. The site serves `index.html`, `style.css`, and
`amlich.js`. Other files (`amlich.test.js`, `AGENTS.md`) don't affect the site.

### Telegram Mini App

After deploying to GitHub Pages, set the URL in BotFather (see above). The
same deployment serves both the web page and the Telegram Mini App.

## Possible Future Enhancements

- **Lunar-to-solar conversion** — the inverse of `solarToLunar`. Would require
  iterating new moons around the target lunar date.
- **Vietnamese holidays** — Tết, Giỗ Tổ Hùng Vương (10/3 lunar), Trung Thu
  (15/8 lunar), Vu Lan (15/7 lunar). These are fixed lunar dates, easy to add
  as a lookup in `dateDetailData`.
- **Giờ hoàng đạo** — auspicious hours based on the day's Earthly Branch.
  Pure function of `canChiDay`.
- **Multi-timezone support** — currently hardcoded to TZ=7 in the UI. Could add
  a timezone selector; the core already accepts `timeZone` as a parameter.
- ~~**Dark mode**~~ — done via `prefers-color-scheme: dark` media query.
- **Year/month picker** — replace navigation buttons with dropdowns for faster
  jumping.
