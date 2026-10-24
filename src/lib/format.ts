const DAY = 86_400_000;

/** "hôm qua", "2 ngày trước" / "yesterday", "2 days ago". Lower-cased: it is used mid-sentence. */
export function relativeDays(date: Date, now: Date, locale: string) {
  const days = Math.round((date.getTime() - now.getTime()) / DAY);
  const text = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
  return text.charAt(0).toLocaleLowerCase(locale) + text.slice(1);
}

export function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}
