import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/clinic";
import { Calendar, Clock, Hash, MapPin, Search, Stethoscope, XCircle } from "lucide-react";
import {
  getAppointmentsByMobile,
  cancelAppointmentByMobile,
} from "@/lib/patient-appointments.functions";

export const Route = createFileRoute("/my-appointments")({
  component: MyAppointments,
});

type Row = {
  id: string;
  doctor_id: string | null;
  patient_id: string;
  appointment_date: string;
  estimated_time: string | null;
  token_number: number | null;
  status: string;
  consultation_fee: number;
  patient_name: string | null;
  doctor: {
    id: string;
    doctor_name: string;
    specialization: string;
    clinic_name: string;
    clinic_address: string;
    city: string;
  } | null;
};

function MyAppointments() {
  const { lang } = useI18n();
  const fetchFn = useServerFn(getAppointmentsByMobile);
  const cancelFn = useServerFn(cancelAppointmentByMobile);

  const [mobile, setMobile] = useState("");
  const [searchedMobile, setSearchedMobile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  async function load(numberToUse: string) {
    if (!/^[6-9]\d{9}$/.test(numberToUse)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchFn({ data: { mobile: numberToUse } });
      setRows(res.appointments as Row[]);
      setSearchedMobile(numberToUse);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not load appointments");
    } finally {
      setLoading(false);
    }
  }

  async function onCancel(id: string) {
    if (!searchedMobile) return;
    if (!confirm("Cancel this appointment? This cannot be undone.")) return;
    try {
      await cancelFn({ data: { appointmentId: id, mobile: searchedMobile } });
      toast.success("Appointment cancelled");
      load(searchedMobile);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not cancel");
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">Patient</div>
        <h1 className="mt-1 text-3xl font-extrabold">My appointments</h1>
        <p className="text-sm text-muted-foreground">
          Enter the mobile number you booked with to see all your appointments.
        </p>

        <Card className="mt-6 p-5 shadow-card">
          <form
            onSubmit={(e) => { e.preventDefault(); load(mobile.trim()); }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold">Mobile number</label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                className="h-11"
              />
            </div>
            <Button type="submit" className="h-11 sm:w-40" disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Searching…" : "Search"}
            </Button>
          </form>
        </Card>

        {searchedMobile && !loading && (
          <>
            {rows.length === 0 ? (
              <Card className="mt-6 p-8 text-center shadow-card">
                <p className="text-sm text-muted-foreground">
                  No appointments found for <span className="font-semibold text-foreground">+91 {searchedMobile}</span>.
                </p>
                <Button asChild className="mt-4"><Link to="/doctors">Find a doctor</Link></Button>
              </Card>
            ) : (
              <div className="mt-6 space-y-3">
                {rows.map((r) => (
                  <Appt key={r.id} r={r} today={today} lang={lang} onCancel={onCancel} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Appt({ r, today, lang, onCancel }: {
  r: Row; today: string; lang: "en" | "hi"; onCancel: (id: string) => void;
}) {
  const status = APPOINTMENT_STATUS_LABEL[r.status];
  const isFuture = r.appointment_date >= today;
  const canCancel =
    isFuture &&
    r.status !== "completed" &&
    r.status !== "cancelled" &&
    r.status !== "consulting";

  return (
    <Card className="p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <div className="text-center">
              <div className="text-[9px] font-bold uppercase opacity-70">Token</div>
              <div className="text-lg font-extrabold leading-none">{r.token_number ?? "—"}</div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{r.doctor?.doctor_name ?? "Doctor"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {r.doctor?.specialization}
              {r.doctor?.clinic_name ? ` • ${r.doctor.clinic_name}` : ""}
            </div>
            {r.doctor?.clinic_address && (
              <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{r.doctor.clinic_address}, {r.doctor.city}</span>
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{r.appointment_date}</span>
              {r.estimated_time && (
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{r.estimated_time}</span>
              )}
              {status && (
                <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + status.tone}>
                  {status[lang]}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {r.doctor && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/queue/$doctorId" params={{ doctorId: r.doctor.id }}>Live queue</Link>
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="ghost" onClick={() => onCancel(r.id)}>
              <XCircle className="mr-1 h-3.5 w-3.5" />Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Hash className="h-3.5 w-3.5" />{r.id.slice(0, 8).toUpperCase()}
        </span>
        <span className="inline-flex items-center gap-1">
          <Stethoscope className="h-3.5 w-3.5" />₹{r.consultation_fee}
        </span>
        {r.patient_name && (
          <span className="ml-auto text-muted-foreground">For: {r.patient_name}</span>
        )}
      </div>
    </Card>
  );
}
