import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CLINIC, APPOINTMENT_STATUS_LABEL } from "@/lib/clinic";
import { CheckCircle2, MapPin, Stethoscope, Calendar, Clock, Hash } from "lucide-react";

export const Route = createFileRoute("/confirmation/$id")({
  component: Confirmation,
});

type Appt = {
  id: string;
  appointment_date: string;
  token_number: number | null;
  status: string;
  consultation_fee: number;
  estimated_time: string | null;
};

function Confirmation() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const [appt, setAppt] = useState<Appt | null>(null);
  const [patientName, setPatientName] = useState("");
  const [paid, setPaid] = useState<"paid" | "pending" | "failed">("pending");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: a }, { data: pr }, { data: p }] = await Promise.all([
        supabase.from("appointments").select("id, appointment_date, token_number, status, consultation_fee, estimated_time").eq("id", id).single(),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("payments").select("status").eq("appointment_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (a) setAppt(a as Appt);
      if (pr) setPatientName(pr.full_name ?? "");
      if (p) setPaid((p.status as any) ?? "pending");
    })();
  }, [id]);

  const slotTime = appt?.token_number ? estimateTime(appt.token_number) : "—";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold">{t("confirmed")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Show this token at the clinic reception.</p>
        </div>

        <Card className="mt-6 bg-hero p-7 text-center text-primary-foreground shadow-elevated">
          <div className="text-xs font-bold uppercase tracking-widest opacity-80">{t("tokenNumber")}</div>
          <div className="mt-1 text-7xl font-extrabold tracking-tight">
            {appt?.token_number ?? "…"}
          </div>
          <div className="mt-2 text-sm opacity-85">{patientName}</div>
        </Card>

        <Card className="mt-5 p-6 shadow-card">
          <Row icon={Hash}      title={t("appointmentId")}  value={appt?.id?.slice(0, 8).toUpperCase() ?? "—"} />
          <Row icon={Calendar}  title={t("appointmentDate")} value={appt?.appointment_date ?? "—"} />
          <Row icon={Clock}     title={t("appointmentTime")} value={slotTime} />
          <Row icon={Stethoscope} title={t("doctorName")}    value={CLINIC.doctor.name} />
          <Row icon={MapPin}    title={t("clinicAddress")}   value={CLINIC.address} />
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-sm font-semibold">{t("paymentStatus")}</span>
            <span className={"rounded-full px-3 py-1 text-xs font-bold " + (paid === "paid" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground")}>
              {paid === "paid" ? t("paid") : paid === "failed" ? t("failed") : t("pending")}
            </span>
          </div>
          {appt && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Status</span>
              <span className={"rounded-full px-3 py-1 text-xs font-bold " + APPOINTMENT_STATUS_LABEL[appt.status]?.tone}>
                {APPOINTMENT_STATUS_LABEL[appt.status]?.[lang]}
              </span>
            </div>
          )}
        </Card>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="h-11 flex-1"><Link to="/queue">{t("viewLive")}</Link></Button>
          <Button asChild variant="outline" className="h-11 flex-1"><Link to="/dashboard">{t("dashboard")}</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Row({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function estimateTime(token: number): string {
  // 10:00 AM start + slotMinutes per token
  const base = new Date(); base.setHours(10, 0, 0, 0);
  base.setMinutes(base.getMinutes() + (token - 1) * CLINIC.slotMinutes);
  return base.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
