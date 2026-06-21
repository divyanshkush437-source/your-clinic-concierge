import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CLINIC, APPOINTMENT_STATUS_LABEL } from "@/lib/clinic";

export const Route = createFileRoute("/_authenticated/doctor")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isDoctor = (roles ?? []).some(r => r.role === "doctor");
    if (!isDoctor) throw redirect({ to: "/" });
  },
  component: DoctorPage,
});

function DoctorPage() {
  const { t, lang } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, patient_id, appointment_date, token_number, status, notes")
      .eq("appointment_date", today)
      .not("token_number", "is", null)
      .order("token_number");
    if (!appts) return;
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, age, gender, mobile").in("id", appts.map(a => a.patient_id));
    const pm = new Map((profiles ?? []).map(p => [p.id, p]));
    setRows(appts.map(a => ({ ...a, patient: pm.get(a.patient_id) })));
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("doc-live").on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const current = rows.find(r => r.status === "consulting");
  const queue = rows.filter(r => r.status !== "completed" && r.status !== "cancelled" && r.status !== "consulting");
  const completed = rows.filter(r => r.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("doctor")}</div>
        <h1 className="text-3xl font-extrabold">{CLINIC.doctor.name}</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>

        {current && (
          <Card className="mt-6 bg-hero p-6 text-primary-foreground shadow-elevated">
            <div className="text-xs font-bold uppercase tracking-widest opacity-85">Now Consulting</div>
            <div className="mt-1 flex items-baseline gap-4">
              <span className="text-6xl font-extrabold">{current.token_number}</span>
              <div>
                <div className="text-xl font-bold">{current.patient?.full_name}</div>
                <div className="text-sm opacity-85">{current.patient?.age ? current.patient.age + " yrs" : ""} {current.patient?.gender ? "• " + current.patient.gender : ""}</div>
              </div>
            </div>
          </Card>
        )}

        <h2 className="mt-8 text-lg font-bold">In Queue ({queue.length})</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {queue.map(r => <PatientCard key={r.id} r={r} lang={lang} />)}
          {queue.length === 0 && <p className="text-sm text-muted-foreground">Nobody in queue.</p>}
        </div>

        <h2 className="mt-8 text-lg font-bold">Completed ({completed.length})</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {completed.map(r => <PatientCard key={r.id} r={r} lang={lang} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PatientCard({ r, lang }: { r: any; lang: "en" | "hi" }) {
  const s = APPOINTMENT_STATUS_LABEL[r.status];
  return (
    <Card className="flex items-center gap-3 p-3 shadow-card">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <div className="text-center">
          <div className="text-[9px] font-bold uppercase opacity-70">Tok</div>
          <div className="text-base font-extrabold leading-none">{r.token_number}</div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{r.patient?.full_name || "—"}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {r.patient?.age && <span>{r.patient.age}y</span>}
          {r.patient?.gender && <span>• {r.patient.gender}</span>}
          {r.patient?.mobile && <span>• {r.patient.mobile}</span>}
        </div>
      </div>
      <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold " + s?.tone}>{s?.[lang]}</span>
    </Card>
  );
}
