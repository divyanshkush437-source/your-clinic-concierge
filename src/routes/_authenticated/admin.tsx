import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAdmin, checkIsAdmin, setDoctorVerification } from "@/lib/doctor.functions";
import { Check, X, Stethoscope, Users, Calendar, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const bootstrap = useServerFn(bootstrapAdmin);
  const check = useServerFn(checkIsAdmin);
  const setVerification = useServerFn(setDoctorVerification);

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState({ doctors: 0, appointments: 0, patients: 0 });

  useEffect(() => {
    (async () => {
      try {
        const r = await bootstrap(); // first user becomes admin; otherwise no-op
        if (!r.isAdmin) {
          const { isAdmin } = await check();
          if (!isAdmin) { toast.error("Not authorized"); navigate({ to: "/" }); return; }
        }
        setAuthorized(true);
        await load();
      } catch (err: any) {
        toast.error(err?.message ?? "Could not load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function load() {
    const [{ data: docs }, { count: aCount }, { count: pCount }] = await Promise.all([
      supabase.from("doctors").select("*").order("created_at", { ascending: false }),
      supabase.from("appointments").select("*", { count: "exact", head: true }),
      supabase.from("patients").select("*", { count: "exact", head: true }),
    ]);
    setDoctors(docs ?? []);
    setStats({ doctors: (docs ?? []).length, appointments: aCount ?? 0, patients: pCount ?? 0 });
  }

  async function decide(doctorId: string, status: "approved" | "rejected") {
    try {
      await setVerification({ data: { doctorId, status } });
      toast.success(status === "approved" ? "Doctor approved" : "Doctor rejected");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</main></div>;
  if (!authorized) return null;

  const pending = doctors.filter(d => d.verification_status === "pending");
  const approved = doctors.filter(d => d.verification_status === "approved");
  const rejected = doctors.filter(d => d.verification_status === "rejected");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">Super Admin</div>
            <h1 className="text-2xl font-extrabold">Platform</h1>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat icon={Stethoscope} title="Total doctors" value={String(stats.doctors)} />
          <Stat icon={Calendar} title="Total appointments" value={String(stats.appointments)} />
          <Stat icon={Users} title="Total patients" value={String(stats.patients)} />
        </div>

        <Tabs defaultValue="pending" className="mt-6">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending"><DoctorList docs={pending} onDecide={decide} showActions /></TabsContent>
          <TabsContent value="approved"><DoctorList docs={approved} onDecide={decide} /></TabsContent>
          <TabsContent value="rejected"><DoctorList docs={rejected} onDecide={decide} showActions /></TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 p-4 shadow-card">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="text-2xl font-extrabold">{value}</div>
      </div>
    </Card>
  );
}

function DoctorList({ docs, onDecide, showActions }: { docs: any[]; onDecide: (id: string, s: "approved" | "rejected") => void; showActions?: boolean }) {
  if (docs.length === 0) return <p className="mt-4 text-sm text-muted-foreground">None.</p>;
  return (
    <div className="mt-4 space-y-3">
      {docs.map(d => (
        <Card key={d.id} className="flex flex-col gap-3 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="truncate font-bold">{d.doctor_name}</div>
            <div className="truncate text-sm text-primary">{d.specialization}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{d.qualification} • {d.experience_years} yrs • {d.clinic_name}, {d.city}</div>
            <div className="text-xs text-muted-foreground">{d.email} • {d.phone} • ₹{d.consultation_fee}</div>
          </div>
          {showActions && (
            <div className="flex shrink-0 gap-2">
              {d.verification_status !== "approved" && <Button size="sm" onClick={() => onDecide(d.id, "approved")}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>}
              {d.verification_status !== "rejected" && <Button size="sm" variant="outline" onClick={() => onDecide(d.id, "rejected")}><X className="mr-1 h-3.5 w-3.5" />Reject</Button>}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
