// Single-clinic, single-doctor configuration for SmartClinic Queue v1.
export const CLINIC = {
  name: "SmartClinic",
  tagline: "Care without the wait",
  doctor: {
    name: "Dr. Anjali Verma",
    specialization: "MBBS, MD — General Physician",
    experience: "12+ years experience",
    photo: "",
  },
  address: "Plot 14, Main Bazaar Road, Sector 9, Lucknow, Uttar Pradesh 226001",
  phone: "+91 98100 12345",
  email: "care@smartclinic.in",
  hours: "Mon – Sat • 10:00 AM – 2:00 PM, 5:00 PM – 8:00 PM",
  consultationFee: 300, // INR
  maxPatientsPerDay: 30,
  slotMinutes: 12, // approx per consultation
} as const;

export const APPOINTMENT_STATUS_LABEL: Record<string, { en: string; hi: string; tone: string }> = {
  booked:     { en: "Booked",      hi: "बुक्ड",          tone: "bg-primary-soft text-primary" },
  arrived:    { en: "Arrived",     hi: "आ चुके",         tone: "bg-accent text-accent-foreground" },
  in_queue:   { en: "In Queue",    hi: "क्यू में",        tone: "bg-warning/20 text-warning-foreground" },
  consulting: { en: "Consulting",  hi: "जाँच चल रही है",  tone: "bg-success/20 text-success-foreground" },
  completed:  { en: "Completed",   hi: "पूर्ण",            tone: "bg-muted text-muted-foreground" },
  cancelled:  { en: "Cancelled",   hi: "रद्द",             tone: "bg-destructive/15 text-destructive" },
};
