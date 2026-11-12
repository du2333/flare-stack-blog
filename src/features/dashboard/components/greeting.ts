import { m } from "@/paraglide/messages";

/** Good morning, afternoon or evening by the local hour. */
export function greeting(name: string, hour: number) {
  if (hour >= 5 && hour < 12) return m.dashboard_greeting_morning({ name });
  if (hour >= 12 && hour < 18) return m.dashboard_greeting_afternoon({ name });
  return m.dashboard_greeting_evening({ name });
}
