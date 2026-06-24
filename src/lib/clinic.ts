// Platform constants for the multi-doctor SmartClinic marketplace.
export const PLATFORM = {
  name: "SmartClinic",
  tagline: "Find doctors. Book online. Skip the queue.",
  email: "hello@smartclinic.in",
} as const;

export const SPECIALIZATIONS = [
  "General Physician",
  "Dentist",
  "Pediatrician",
  "Gynecologist",
  "Dermatologist",
  "Cardiologist",
  "Orthopedic",
  "ENT Specialist",
  "Psychiatrist",
  "Ophthalmologist",
] as const;

export const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
] as const;

export const APPOINTMENT_STATUS_LABEL: Record<string, { en: string; hi: string; tone: string }> = {
  booked:     { en: "Booked",      hi: "बुक्ड",          tone: "bg-primary-soft text-primary" },
  arrived:    { en: "Arrived",     hi: "आ चुके",         tone: "bg-accent text-accent-foreground" },
  in_queue:   { en: "In Queue",    hi: "क्यू में",        tone: "bg-warning/20 text-warning-foreground" },
  consulting: { en: "Consulting",  hi: "जाँच चल रही है",  tone: "bg-success/20 text-success-foreground" },
  completed:  { en: "Completed",   hi: "पूर्ण",            tone: "bg-muted text-muted-foreground" },
  cancelled:  { en: "Cancelled",   hi: "रद्द",             tone: "bg-destructive/15 text-destructive" },
};

// Build half-hour slot list between two HH:MM strings.
export function generateSlots(start: string, end: string, stepMin = 30): string[] {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const pad = (n: number) => String(n).padStart(2, "0");
  const slots: string[] = [];
  let cur = toMin(start);
  const last = toMin(end);
  while (cur + stepMin <= last + 0.0001) {
    slots.push(`${pad(Math.floor(cur / 60))}:${pad(cur % 60)}`);
    cur += stepMin;
  }
  return slots;
}
