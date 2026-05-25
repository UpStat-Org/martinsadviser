# Changelog

## 2026-05-25 — autonomous bug-fix + test sweep

### Bug fixes

- **MCS-150 schedule no longer hides overdue filings.**
  `src/lib/mcs150.ts` previously projected the next-due filing using the start
  of the assigned filing month (day 1). Once the calendar passed day 1 of the
  current cycle without a recorded filing, the projector silently rolled
  forward two years and the `<Mcs150Card>` showed "ok" instead of "overdue".
  Now the projector targets the **last day** of the filing month (the actual
  deadline), walks backward up to one prior cycle, and only rolls forward
  when the previous deadline is more than ~365 days stale. So a carrier who
  missed their July 31 filing window sees `overdue by N days` against that
  same date until they mark it filed.
- **Truck/permit search no longer break on punctuation.** `useTrucks` and
  `usePermits` interpolated the raw query string into a PostgREST `.or()`
  filter; a comma, paren, or dot in the user's input would either error out
  the request or silently match the wrong columns. `useClients`, `useTrucks`,
  and `usePermits` now route their search term through the shared
  `sanitizeSearchTerm` helper (also escapes the `%` / `_` ILIKE wildcards so
  user input matches literally).

### Improvements

- **`useLocalStorageState` syncs across tabs.** A `storage`-event listener
  picks up writes from other tabs/windows; preferences (saved views, table
  toggles, etc.) stay coherent when the user has the app open in multiple
  tabs. Null `newValue` (key removed elsewhere) snaps back to the initial
  value.
- **`ErrorBoundary` now logs caught errors.** Added `componentDidCatch` so
  uncaught render errors surface in the browser console with the component
  stack instead of being silently swallowed — the user still sees the
  friendly fallback UI.
- **Quieter `LanguageContext` test output.** The "throws when used outside
  provider" case now silences React's expected error-boundary noise so the
  vitest log doesn't bury real failures.

### Tests

Added 99 tests across pure helpers and components (test count went from 34 → 133):

| Module                          | Coverage added                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `lib/mcs150`                    | DOT-schedule projection, recorded-filing offset, overdue regression             |
| `lib/hvut`                      | bracket logic, tax-year cutoffs, filing deadlines (including December wrap)     |
| `lib/ifta`                      | per-jurisdiction taxable gallons, MPG-zero fallback, code normalization         |
| `lib/scorecard`                 | services coverage, doc fields, expired vs expiring permits, truck completeness  |
| `lib/newEntrant`                | active / audit_overdue / ending_soon / completed transitions                    |
| `lib/complianceCalendar`        | event range filtering, RFC-5545-ish ICS output, CRLF terminators                |
| `lib/drugTestingPool`           | 50%/10% quarterly split, exclude set, empty pool                                |
| `lib/revenueForecast`           | cumulative bucketing, client-history vs org-average source, 90-day cap          |
| `lib/csa`                       | threshold metadata + `scoreLevel` 'ok' / 'watch' / 'alert' classification       |
| `lib/risk`                      | band ordering, `isAtRisk`, factor label fallback / count interpolation          |
| `lib/color`                     | hex→HSL conversion, contrast foreground, `isHexColor` validator                 |
| `lib/orgHost`                   | dev hosts, apex, reserved subdomains, slug normalization                        |
| `hooks/useLocalStorageState`    | hydrate / persist / cross-tab sync / malformed-JSON fallback                    |
| `lib/utils.sanitizeSearchTerm`  | PostgREST syntax stripping, ILIKE wildcards, whitespace trim                    |
| `components/EmptyState`         | title/description/icon rendering + primary/secondary action slots               |
| `components/PaginationBar`      | hidden when single page, prev/next disabled states, onPageChange wiring         |
| `components/ErrorBoundary`      | renders children on the happy path, fallback + componentDidCatch on throw      |

Result: `npm test` → 133/133 passing.
