import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { DAYS } from "@/lib/clinic";
import { Stethoscope, MapPin, IndianRupee, Clock, GraduationCap, Briefcase, Star, Phone } from "lucide-react";

export const Route = createFileRoute("/doctors/$id")({
  component: DoctorProfile,
});

function DoctorProfile() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("doctors").select("*").eq("id", id).eq("verification_status", "approved").maybeSingle();
      setDoc(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  if (!doc) return <Shell><p className="text-sm text-muted-foreground">Doctor not found.</p></Shell>;

  const daysLabel = DAYS.filter(d => (doc.available_days ?? []).includes(d.value)).map(d => d.label).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Card className="overflow-hidden shadow-elevated">
          <div className="bg-hero p-7 text-primary-foreground">
            <div className="flex items-start gap-5">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/15 backdrop-blur">
                {doc.profile_photo_url
                  ? <img src={doc.profile_photo_url} alt="" className="h-full w-full object-cover" />
                  : <Stethoscope className="h-12 w-12" />}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-3xl font-extrabold">{doc.doctor_name}</h1>
                <p className="mt-1 text-base opacity-90">{doc.specialization}</p>
                <p className="mt-0.5 text-sm opacity-75">{doc.qualification}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 font-semibold backdrop-blur"><Briefcase className="mr-1 inline h-3 w-3" /> {doc.experience_years} yrs</span>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 font-semibold backdrop-blur"><Star className="mr-1 inline h-3 w-3" /> New</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <InfoRow icon={Stethoscope} title="Clinic" value={doc.clinic_name} />
              <InfoRow icon={MapPin}       title="Address" value={`${doc.clinic_address}, ${doc.city}, ${doc.state}`} />
              <InfoRow icon={Clock}        title={t("availableTimings")} value={`${doc.time_start} – ${doc.time_end} • ${daysLabel || "—"}`} />
              <InfoRow icon={GraduationCap} title={t("experience")} value={`${doc.experience_years} years`} />
              {doc.phone && <InfoRow icon={Phone} title="Phone" value={doc.phone} />}
            </div>

            <Card className="h-fit p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{t("consultationFee")}</span>
                <span className="flex items-center text-2xl font-extrabold text-primary">
                  <IndianRupee className="h-5 w-5" />{doc.consultation_fee}
                </span>
              </div>
              <Button asChild size="lg" className="mt-4 w-full">
                <Link to="/book/$doctorId" params={{ doctorId: doc.id }}>{t("bookNow")}</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="mt-2 w-full">
                <Link to="/queue/$doctorId" params={{ doctorId: doc.id }}>{t("viewLive")}</Link>
              </Button>
            </Card>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function InfoRow({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">{children}</main>
      <Footer />
    </div>
  );
}
