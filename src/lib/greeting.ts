/**
 * Time-of-day greeting for outbound emails/SMS, always read in Lagos local
 * time regardless of the server's own timezone (Vercel runs in UTC — a
 * naive `new Date().getHours()` would be off by an hour and wrong right
 * around the morning/afternoon/night boundaries).
 */
export function timeOfDayGreeting(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(date)
  );
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good night";
}
