import type { SelectOption } from "@/components/pulse/select-input";

/**
 * Currency / time-zone option lists for the gym settings selects, sourced from the
 * runtime's ISO-4217 / IANA sets (money-rules §1 / time-rules §1) — no hardcoded list to
 * drift. Computed server-side and passed into the client form as props.
 */
export function currencyOptions(): SelectOption[] {
  return Intl.supportedValuesOf("currency").map((code) => ({ value: code, label: code }));
}

export function timeZoneOptions(): SelectOption[] {
  return Intl.supportedValuesOf("timeZone").map((tz) => ({ value: tz, label: tz }));
}
