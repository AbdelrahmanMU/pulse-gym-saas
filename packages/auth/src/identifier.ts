/**
 * Sign-in identifier handling (Pilot Readiness). The sign-in form has ONE identifier
 * field that accepts a phone number OR an email — gym staff know each other by phone
 * first, so the identifier must never force "which kind?" on the user. Pure and
 * dependency-free (browser- and server-safe), used by both the credential resolver
 * (lookup side) and staff validation (storage side) so the two always agree.
 */

/** Arabic-Indic (٠…٩) and Extended Arabic-Indic (۰…۹) digit blocks → ASCII. */
const NON_ASCII_DIGITS = /[٠-٩۰-۹]/g;

/** Characters people legitimately type inside phone numbers; stripped, never rejected. */
const PHONE_SEPARATORS = /[\s\-().]/g;

/** A canonical phone: optional leading `+`, then 6–20 digits. */
const CANONICAL_PHONE = /^\+?\d{6,20}$/;

/**
 * `true` when the identifier should be resolved as an email. Phones never contain
 * `@`, so this single character is the whole decision — no fragile format guessing.
 */
export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes("@");
}

/**
 * Canonicalize a phone number for storage AND lookup: Arabic-Indic digits become
 * ASCII, separators (spaces, dashes, dots, parentheses) are stripped, a single
 * leading `+` survives. Returns `null` when the result is not a plausible phone
 * (6–20 digits) — callers treat that as "not a phone", never as an error.
 *
 * Equivalence rewrites (Pilot UX Finish) — the same real-world number must land on
 * ONE canonical string however the receptionist types it. These are **fixed dialing
 * rules, not country detection** (no guessing, no library):
 *  - `00…` → `+…` (the universal international-dialing prefix);
 *  - `+20…` → `0…` (`+20` is uniquely Egypt — the pilot market; the local `0` trunk
 *    form is the canonical because that is how every existing phone is stored);
 *  - bare `20` + a 10-digit mobile (`1…`) → `0…` (people paste the E.164 digits
 *    without the `+`). Landlines without `+` stay as typed — too ambiguous.
 * Applied identically at the staff write boundary and the login lookup, so both
 * sides always agree.
 */
export function normalizePhone(raw: string): string | null {
  const ascii = raw.trim().replace(NON_ASCII_DIGITS, (digit) => {
    const code = digit.charCodeAt(0);
    const zero = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String.fromCharCode(code - zero + 0x30);
  });
  let compact = ascii.replace(PHONE_SEPARATORS, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (compact.startsWith("+20")) compact = `0${compact.slice(3)}`;
  else if (/^201\d{9}$/.test(compact)) compact = `0${compact.slice(2)}`;
  return CANONICAL_PHONE.test(compact) ? compact : null;
}
