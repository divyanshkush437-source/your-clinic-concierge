import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/clinic";
import { Calendar, Clock, Hash, Stethoscope, XCircle, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/patient/dashboard")({
  component: PatientDashboard,
});

type Row = {
  id: string;
  doctor_id: string | null;
  appointment_date: string;
  estimated_time: string | null;
  token_number: number | null;
  status: string;
  consultation_fee: number;
  doctor?: { id: string; doctor_name: string; specialization: string; clinic_name: string };
  current_token?: number | null;
};

function PatientDashboard() {
  const { t, lang } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [patientIds, setPatientIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data: ures } = await supabase.auth.getUser();
    const uid = ures.user?.id;
    if (!uid) return;

    // Auto-link past walk-in bookings by phone
    const { data: prof } = await supabase.from("profiles").select("mobile").eq("id", uid).maybeSingle();
    if (prof?.mobile) {
      try { await supabase.rpc("claim_patient_records" as any, { _phone: prof.mobile } as any); } catch {}
    }

    const { data: pats } = await supabase.from("patients").select("id").eq("user_id", uid);
    const ids = (pats ?? []).map(p => p.id);
    setPatientIds(ids);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }

    const { data: appts } = await supabase
      .from("appointments")
      .select("id, doctor_id, appointment_date, estimated_time, token_number, status, consultation_fee")
      .in("patient_id", ids)
      .order("appointment_date", { ascending: false })
      .order("token_number", { ascending: true, nullsFirst: false });

    const docIds = Array.from(new Set((appts ?? []).map(a => a.doctor_id).filter(Boolean) as string[]));
    const { data: docs } = docIds.length
      ? await supabase.from("doctors").select("id, doctor_name, specialization, clinic_name").in("id", docIds)
      : { data: [] as any[] };
    const dMap = new Map((docs ?? []).map(d => [d.id, d]));

    // Determine current_token for today rows
    const todayDocs = Array.from(new Set((appts ?? []).filter(a => a.appointment_date === today && a.doctor_id).map(a => a.doctor_id as string)));
    const currentByDoc = new Map<string, number | null>();
    if (todayDocs.length) {
      const { data: cur } = await supabase
        .from("appointments")
        .select("doctor_id, token_number")
        .in("doctor_id", todayDocs)
        .eq("appointment_date", today)
        .eq("status", "consulting");
      (cur ?? []).forEach(c => currentByDoc.set(c.doctor_id as string, c.token_number));
    }

    setRows((appts ?? []).map(a => ({
      ...a,
      doctor: a.doctor_id ? (dMap.get(a.doctor_id) as any) : undefined,
      current_token: a.doctor_id ? currentByDoc.get(a.doctor_id) ?? null : null,
    })));
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refetch when any of our appointments change
  useEffect(() => {
    if (patientIds.length === 0) return;
    const ch = supabase
      .channel(`patient-appts`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientIds, load]);

  async function cancel(id: string) {
    if (!confirm("Cancel this appointment? This cannot be undone.")) return;
    const { error } = await supabase.rpc("cancel_my_appointment" as any, { _appointment_id: id } as any);
    if (error) toast.error(error.message);
    else { toast.success("Cancelled"); load(); }
  }

  const upcoming = rows.filter(r => r.appointment_date >= today && r.status !== "completed" && r.status !== "cancelled");
  const history  = rows.filter(r => r.appointment_date < today || r.status === "completed" || r.status === "cancelled");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">My account</div>
        <h1 className="mt-1 text-3xl font-extrabold">My appointments</h1>
        <p className="text-sm text-muted-foreground">Track tokens, queue position and history</p>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <Card className="mt-8 p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">No appointments yet linked to your account.</p>
            <Button asChild className="mt-4"><Link to="/doctors">Find a doctor</Link></Button>
          </Card>
        ) : (
          <>
            <h2 className="mt-8 text-lg font-bold">Upcoming ({upcoming.length})</h2>
            <div className="mt-3 space-y-3">
              {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming appointments.</p>}
              {upcoming.map(r => <Appt key={r.id} r={r} lang={lang} t={t} onCancel={cancel} />)}
            </div>

            <h2 className="mt-8 text-lg font-bold">History ({history.length})</h2>
            <div className="mt-3 space-y-3">
              {history.length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
              {history.map(r => <Appt key={r.id} r={r} lang={lang} t={t} onCancel={cancel} />)}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Appt({ r, lang, t, onCancel }: {
  r: Row; lang: "en" | "hi"; t: (k: any) => string;
  onCancel: (id: string) => void;
}) {
  const status = APPOINTMENT_STATUS_LABEL[r.status];
  const today = new Date().toISOString().slice(0, 10);
  const isToday = r.appointment_date === today;
  const isFuture = r.appointment_date >= today;
  const canCancel = isFuture && r.status !== "completed" && r.status !== "cancelled" && r.status !== "consulting";

  // queue position: count tokens ahead that are not completed/cancelled
  const ahead = (() => {
    if (!isToday || r.token_number == null || r.current_token == null) return null;
    return Math.max(0, r.token_number - r.current_token - 1);
  })();

  return (
    <Card className="p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <div className="text-center">
              <div className="text-[9px] font-bold uppercase opacity-70">{t("tokenNumber")}</div>
              <div className="text-lg font-extrabold leading-none">{r.token_number ?? "—"}</div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{r.doctor?.doctor_name ?? "Doctor"}</div>
            <div className="text-xs text-muted-foreground truncate">{r.doctor?.specialization} • {r.doctor?.clinic_name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{r.appointment_date}</span>
              {r.estimated_time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{r.estimated_time}</span>}
              {status && <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + status.tone}>{status[lang]}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isToday && r.current_token != null && (
            <div className="rounded-lg bg-secondary px-3 py-1.5 text-xs">
              <span className="font-semibold">Now serving:</span>{" "}
              <span className="font-extrabold text-primary">{r.current_token}</span>
              {ahead != null && ahead > 0 && <span className="ml-2 text-muted-foreground">• {ahead} ahead</span>}
              {ahead === 0 && <span className="ml-2 font-semibold text-success">You're next</span>}
            </div>
          )}
          <div className="flex gap-2">
            {r.doctor && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/queue/$doctorId" params={{ doctorId: r.doctor.id }}>
                  <Activity className="mr-1 h-3.5 w-3.5" />Live queue
                </Link>
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="ghost" onClick={() => onCancel(r.id)}>
                <XCircle className="mr-1 h-3.5 w-3.5" />Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{r.id.slice(0, 8).toUpperCase()}</span>
        <span className="inline-flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" />₹{r.consultation_fee}</span>
      </div>
    </Card>
  );
}
