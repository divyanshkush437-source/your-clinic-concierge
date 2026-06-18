import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "hi";

const dict = {
  en: {
    appName: "SmartClinic Queue",
    tagline: "Skip the line. Track your turn live.",
    book: "Book Appointment",
    bookNow: "Book Appointment",
    dashboard: "My Appointments",
    admin: "Clinic Staff",
    doctor: "Doctor",
    home: "Home",
    signIn: "Sign In",
    signUp: "Sign Up",
    signOut: "Sign Out",
    language: "हिंदी",
    queueLive: "Live Queue",
    fullName: "Full Name",
    mobile: "Mobile Number",
    age: "Age",
    gender: "Gender",
    address: "Address (optional)",
    male: "Male", female: "Female", other: "Other",
    email: "Email", password: "Password",
    selectDate: "Select date",
    consultationFee: "Consultation Fee",
    payAndBook: "Pay & Confirm Booking",
    payNow: "Pay Now",
    confirmed: "Booking Confirmed!",
    tokenNumber: "Token Number",
    appointmentId: "Appointment ID",
    appointmentDate: "Date",
    appointmentTime: "Estimated Time",
    clinicAddress: "Clinic Address",
    doctorName: "Doctor",
    paymentStatus: "Payment Status",
    upcoming: "Upcoming",
    history: "History",
    cancel: "Cancel",
    cancelAppt: "Cancel Appointment",
    estWait: "Estimated wait",
    currentToken: "Now Serving",
    nextToken: "Next",
    waiting: "Patients waiting",
    minutes: "min",
    todayAppts: "Today's Appointments",
    callNext: "Call Next Patient",
    skip: "Skip",
    complete: "Complete",
    markArrived: "Mark Arrived",
    search: "Search patients",
    waitingList: "Waiting List",
    addedToWaitlist: "Day is full — added to waiting list",
    noUpcoming: "No upcoming appointments",
    welcomeBack: "Welcome back",
    createAccount: "Create your account",
    alreadyHaveAccount: "Already have an account?",
    needAccount: "Need an account?",
    yourTurnSoon: "Your turn is approaching",
    paid: "Paid", pending: "Pending", failed: "Failed",
    todaySchedule: "Today's Schedule",
    viewLive: "View Live Queue",
    contact: "Contact",
    about: "About",
    bookingLoading: "Confirming booking…",
  },
  hi: {
    appName: "स्मार्टक्लिनिक क्यू",
    tagline: "अब लाइन में नहीं — अपनी बारी लाइव देखें।",
    book: "अपॉइंटमेंट बुक करें",
    bookNow: "अभी बुक करें",
    dashboard: "मेरे अपॉइंटमेंट",
    admin: "क्लिनिक स्टाफ",
    doctor: "डॉक्टर",
    home: "होम",
    signIn: "लॉगिन",
    signUp: "रजिस्टर",
    signOut: "लॉग आउट",
    language: "English",
    queueLive: "लाइव क्यू",
    fullName: "पूरा नाम",
    mobile: "मोबाइल नंबर",
    age: "उम्र",
    gender: "लिंग",
    address: "पता (वैकल्पिक)",
    male: "पुरुष", female: "महिला", other: "अन्य",
    email: "ईमेल", password: "पासवर्ड",
    selectDate: "दिनांक चुनें",
    consultationFee: "परामर्श शुल्क",
    payAndBook: "भुगतान करें और बुक करें",
    payNow: "भुगतान करें",
    confirmed: "बुकिंग कन्फर्म!",
    tokenNumber: "टोकन नंबर",
    appointmentId: "अपॉइंटमेंट आईडी",
    appointmentDate: "दिनांक",
    appointmentTime: "अनुमानित समय",
    clinicAddress: "क्लिनिक का पता",
    doctorName: "डॉक्टर",
    paymentStatus: "भुगतान स्थिति",
    upcoming: "आगामी",
    history: "इतिहास",
    cancel: "रद्द",
    cancelAppt: "अपॉइंटमेंट रद्द करें",
    estWait: "अनुमानित प्रतीक्षा",
    currentToken: "अभी चल रहा",
    nextToken: "अगला",
    waiting: "मरीज़ कतार में",
    minutes: "मिनट",
    todayAppts: "आज के अपॉइंटमेंट",
    callNext: "अगला मरीज़ बुलाएँ",
    skip: "छोड़ें",
    complete: "पूर्ण",
    markArrived: "आ गए मार्क करें",
    search: "मरीज़ खोजें",
    waitingList: "वेटिंग लिस्ट",
    addedToWaitlist: "आज स्लॉट पूरे — वेटिंग लिस्ट में जोड़ा गया",
    noUpcoming: "कोई आगामी अपॉइंटमेंट नहीं",
    welcomeBack: "वापसी पर स्वागत है",
    createAccount: "खाता बनाएँ",
    alreadyHaveAccount: "पहले से खाता है?",
    needAccount: "खाता चाहिए?",
    yourTurnSoon: "आपकी बारी नज़दीक है",
    paid: "भुगतान हो गया", pending: "लंबित", failed: "असफल",
    todaySchedule: "आज का शेड्यूल",
    viewLive: "लाइव क्यू देखें",
    contact: "संपर्क",
    about: "हमारे बारे में",
    bookingLoading: "बुकिंग कन्फर्म हो रही है…",
  },
} as const;

type Key = keyof typeof dict["en"];
type Ctx = { lang: Lang; t: (k: Key) => string; toggle: () => void };

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("lang") as Lang | null) : null;
    if (stored === "en" || stored === "hi") setLang(stored);
  }, []);
  const toggle = () => {
    setLang((l) => {
      const next = l === "en" ? "hi" : "en";
      if (typeof window !== "undefined") localStorage.setItem("lang", next);
      return next;
    });
  };
  const t = (k: Key) => dict[lang][k] ?? dict.en[k];
  return <I18nCtx.Provider value={{ lang, t, toggle }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
