const US_NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

/**
 * Formats numeric counters with an explicit locale so server-rendered HTML
 * always matches client hydration regardless of host or browser locale settings.
 */
export function formatNumber(value: number): string {
  return US_NUMBER_FORMATTER.format(value);
}
