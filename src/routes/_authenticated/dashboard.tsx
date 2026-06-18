import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CLINIC, APPOINTMENT_STATUS_LABEL } from "@/lib/clinic";
import { useRoles } from "@/hooks/useRole";
import { Calendar, Hash, Clock, Plus, Settings, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Appt = {
  id: string;
  appointment_date: string;
  token_number: number | null;
  status: string;
  consultation_fee: number;
};

function Dashboard() {
  const { t, lang } = useI18n();
  const { hasRole } = useRoles();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    const { data } = await supabase
      .from("appointments")
      .select("id, appointment_date, token_number, status, consultation_fee")
      .order("appointment_date", { ascending: false });
    setAppts((data ?? []) as Appt[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function cancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Appointment cancelled");
    load();
  }

  const upcoming = appts.filter(a => a.appointment_date >= today && a.status !== "cancelled" && a.status !== "completed");
  const history = appts.filter(a => !(a.appointment_date >= today && a.status !== "cancelled" && a.status !== "completed"));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">{t("dashboard")}</h1>
            <p className="text-sm text-muted-foreground">{CLINIC.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasRole("staff") && <Button variant="outline" asChild><Link to="/admin"><Settings className="mr-1 h-4 w-4" />{t("admin")}</Link></Button>}
            {hasRole("doctor") && <Button variant="outline" asChild><Link to="/doctor"><Stethoscope className="mr-1 h-4 w-4" />{t("doctor")}</Link></Button>}
            <Button asChild><Link to="/book"><Plus className="mr-1 h-4 w-4" />{t("bookNow")}</Link></Button>
          </div>
        </div>

        <Tabs defaultValue="upcoming" className="mt-6">
          <TabsList className="grid w-full grid-cols-2 md:w-auto">
            <TabsTrigger value="upcoming">{t("upcoming")} ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="history">{t("history")} ({history.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && upcoming.length === 0 && (
              <Card className="p-8 text-center shadow-card">
                <p className="text-muted-foreground">{t("noUpcoming")}</p>
                <Button asChild className="mt-4"><Link to="/book">{t("bookNow")}</Link></Button>
              </Card>
            )}
            {upcoming.map(a => <ApptCard key={a.id} a={a} lang={lang} onCancel={() => cancel(a.id)} cancellable />)}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {history.map(a => <ApptCard key={a.id} a={a} lang={lang} />)}
            {!loading && history.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

function ApptCard({ a, lang, onCancel, cancellable }: { a: Appt; lang: "en" | "hi"; onCancel?: () => void; cancellable?: boolean }) {
  const s = APPOINTMENT_STATUS_LABEL[a.status];
  return (
    <Card className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 shadow-card sm:flex sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase opacity-70">Token</div>
            <div className="text-xl font-extrabold leading-none">{a.token_number ?? "—"}</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {new Date(a.appointment_date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + s?.tone}>{s?.[lang]}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Hash className="h-3 w-3" />{a.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
      </div>
      {cancellable && (
        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </Card>
  );
}
