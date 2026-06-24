import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Activity, Clock, Users } from "lucide-react";

export const Route = createFileRoute("/queue/$doctorId")({
  component: QueuePage,
});

function QueuePage() {
  const { doctorId } = Route.useParams();
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [doc, setDoc] = useState<any>(null);
  const [appts, setAppts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("doctors").select("doctor_name, slot_minutes").eq("id", doctorId).maybeSingle().then(({ data }) => setDoc(data));
  }, [doctorId]);

  async function load() {
    const { data } = await supabase
      .from("appointments")
      .select("id, token_number, status")
      .eq("doctor_id", doctorId)
      .eq("appointment_date", today)
      .not("token_number", "is", null)
      .neq("status", "cancelled")
      .order("token_number");
    setAppts(data ?? []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`queue-${doctorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${doctorId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [doctorId, today]);

  const consulting = appts.find(a => a.status === "consulting");
  const inQueue = appts.filter(a => a.status === "in_queue" || a.status === "arrived" || a.status === "booked");
  const next = inQueue[0];
  const waiting = inQueue.length;
  const slotMin = doc?.slot_minutes ?? 15;
  const estMinutes = waiting * slotMin;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <span className="grid h-2 w-2 place-items-center"><span className="h-2 w-2 animate-ping rounded-full bg-primary" /></span>
          {t("queueLive").toUpperCase()}
        </div>
        <h1 className="mt-1 text-3xl font-extrabold">{t("todaySchedule")}</h1>
        <p className="text-sm text-muted-foreground">{doc?.doctor_name ?? "Doctor"} • {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="bg-hero p-6 text-primary-foreground shadow-elevated">
            <div className="text-xs font-bold uppercase tracking-widest opacity-85">{t("currentToken")}</div>
            <div className="mt-2 text-7xl font-extrabold tracking-tight">{consulting?.token_number ?? "—"}</div>
            <div className="mt-2 text-sm opacity-85">{consulting ? "Consulting now" : "No one being consulted"}</div>
          </Card>
          <Card className="p-6 shadow-card">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("nextToken")}</div>
            <div className="mt-2 text-7xl font-extrabold tracking-tight text-primary">{next?.token_number ?? "—"}</div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <Stat icon={Users}    label={t("waiting")} value={String(waiting)} />
              <Stat icon={Clock}    label={t("estWait")}  value={`${estMinutes} ${t("minutes")}`} />
            </div>
          </Card>
        </div>

        <Card className="mt-5 p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" /> Today's tokens
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {appts.length === 0 && <p className="text-sm text-muted-foreground">No tokens yet today.</p>}
            {appts.map(a => (
              <div
                key={a.id}
                className={"flex h-12 w-12 items-center justify-center rounded-xl text-lg font-extrabold " +
                  (a.status === "consulting" ? "bg-primary text-primary-foreground shadow-elevated" :
                   a.status === "completed" ? "bg-muted text-muted-foreground line-through" :
                   "bg-primary-soft text-primary")}
              >
                {a.token_number}
              </div>
            ))}
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <div className="mt-1 text-base font-bold">{value}</div>
    </div>
  );
}
