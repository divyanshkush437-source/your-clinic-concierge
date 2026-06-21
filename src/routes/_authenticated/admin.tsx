import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CLINIC, APPOINTMENT_STATUS_LABEL } from "@/lib/clinic";
import { Search, ChevronRight, SkipForward, Check, UserCheck, Settings as SettingsIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isStaff = (roles ?? []).some(r => r.role === "staff");
    if (!isStaff) throw redirect({ to: "/" });
  },
  component: AdminPage,
});

type Row = {
  id: string;
  patient_id: string;
  appointment_date: string;
  token_number: number | null;
  status: string;
  patient?: { full_name: string; mobile: string | null };
  payment?: { status: string };
};

function AdminPage() {
  const { t, lang } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");

  async function load() {
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, patient_id, appointment_date, token_number, status")
      .gte("appointment_date", today)
      .order("appointment_date")
      .order("token_number", { ascending: true, nullsFirst: false });
    if (!appts) return;
    const ids = appts.map(a => a.patient_id);
    const [{ data: profiles }, { data: pays }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, mobile").in("id", ids),
      supabase.from("payments").select("appointment_id, status").in("appointment_id", appts.map(a => a.id)),
    ]);
    const pMap = new Map((profiles ?? []).map(p => [p.id, p]));
    const payMap = new Map((pays ?? []).map(p => [p.appointment_id, p]));
    setRows(appts.map(a => ({ ...a, patient: pMap.get(a.patient_id) as any, payment: payMap.get(a.id) as any })));
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  type ApptStatus = "booked" | "arrived" | "in_queue" | "consulting" | "completed" | "cancelled";
  async function setStatus(id: string, status: ApptStatus) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Updated");
  }

  async function callNext() {
    const todays = rows.filter(r => r.appointment_date === today && r.status !== "completed" && r.status !== "cancelled");
    const next = todays.find(r => r.status === "arrived" || r.status === "in_queue") ?? todays.find(r => r.status === "booked");
    if (!next) return toast.info("No one in queue");
    await setStatus(next.id, "consulting");
  }

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.patient?.full_name?.toLowerCase().includes(q) || r.patient?.mobile?.includes(q) || String(r.token_number ?? "").includes(q);
  });

  const todayRows = filtered.filter(r => r.appointment_date === today);
  const upcoming = filtered.filter(r => r.appointment_date > today);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("admin")}</div>
            <h1 className="truncate text-3xl font-extrabold">{CLINIC.name}</h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="lg" variant="outline" asChild>
              <Link to="/settings"><SettingsIcon className="mr-1 h-4 w-4" /> Settings</Link>
            </Button>
            <Button size="lg" onClick={callNext} className="shadow-card">
              <ChevronRight className="mr-1 h-4 w-4" /> {t("callNext")}
            </Button>
          </div>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search")} className="h-11 pl-9" />
        </div>

        <h2 className="mt-6 text-lg font-bold">{t("todayAppts")} ({todayRows.length})</h2>
        <div className="mt-3 space-y-2">
          {todayRows.length === 0 && <p className="text-sm text-muted-foreground">No appointments today.</p>}
          {todayRows.map(r => <AdminRow key={r.id} r={r} lang={lang} onSet={setStatus} />)}
        </div>

        {upcoming.length > 0 && (
          <>
            <h2 className="mt-8 text-lg font-bold">{t("upcoming")} ({upcoming.length})</h2>
            <div className="mt-3 space-y-2">
              {upcoming.map(r => <AdminRow key={r.id} r={r} lang={lang} onSet={setStatus} />)}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function AdminRow({ r, lang, onSet }: { r: Row; lang: "en" | "hi"; onSet: (id: string, s: "booked"|"arrived"|"in_queue"|"consulting"|"completed"|"cancelled") => void }) {
  const s = APPOINTMENT_STATUS_LABEL[r.status];
  return (
    <Card className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 sm:flex sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <div className="text-center">
            <div className="text-[9px] font-bold uppercase opacity-70">Tok</div>
            <div className="text-base font-extrabold leading-none">{r.token_number ?? "—"}</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{r.patient?.full_name || "—"}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{r.patient?.mobile}</span>
            <span>•</span>
            <span>{r.appointment_date}</span>
            <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + s?.tone}>{s?.[lang]}</span>
            {r.payment && <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + (r.payment.status === "paid" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground")}>{r.payment.status}</span>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {r.status === "booked" && <Button size="sm" variant="outline" onClick={() => onSet(r.id, "arrived")}><UserCheck className="mr-1 h-3.5 w-3.5" />Arrived</Button>}
        {(r.status === "arrived" || r.status === "in_queue" || r.status === "booked") && <Button size="sm" variant="outline" onClick={() => onSet(r.id, "consulting")}>Call</Button>}
        {r.status === "consulting" && <Button size="sm" onClick={() => onSet(r.id, "completed")}><Check className="mr-1 h-3.5 w-3.5" />Complete</Button>}
        {r.status !== "completed" && r.status !== "cancelled" && <Button size="sm" variant="ghost" onClick={() => onSet(r.id, "cancelled")}><SkipForward className="mr-1 h-3.5 w-3.5" />Skip</Button>}
      </div>
    </Card>
  );
}
