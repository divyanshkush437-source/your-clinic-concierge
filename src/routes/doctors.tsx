import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SPECIALIZATIONS } from "@/lib/clinic";
import { useI18n } from "@/lib/i18n";
import { Stethoscope, IndianRupee, MapPin, Search } from "lucide-react";

export const Route = createFileRoute("/doctors")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
    specialization: typeof s.specialization === "string" ? s.specialization : undefined,
    city: typeof s.city === "string" ? s.city : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Find Doctors — SmartClinic" },
      { name: "description", content: "Browse verified doctors by specialization and city. View profiles, consultation fees, and book appointments online." },
    ],
  }),
  component: DoctorsList,
});

type Doctor = {
  id: string;
  doctor_name: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  clinic_name: string;
  clinic_address: string;
  city: string;
  state: string;
  consultation_fee: number;
  profile_photo_url: string;
};

function DoctorsList() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [q, setQ] = useState(search.q ?? "");
  const [spec, setSpec] = useState(search.specialization ?? "all");
  const [city, setCity] = useState(search.city ?? "all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("doctors")
        .select("id, doctor_name, specialization, qualification, experience_years, clinic_name, clinic_address, city, state, consultation_fee, profile_photo_url")
        .eq("verification_status", "approved")
        .order("doctor_name");
      setDoctors((data ?? []) as Doctor[]);
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(() => Array.from(new Set(doctors.map(d => d.city).filter(Boolean))).sort(), [doctors]);
  const filtered = useMemo(() => doctors.filter(d => {
    if (q && !d.doctor_name.toLowerCase().includes(q.toLowerCase()) && !d.clinic_name.toLowerCase().includes(q.toLowerCase())) return false;
    if (spec !== "all" && d.specialization !== spec) return false;
    if (city !== "all" && d.city !== city) return false;
    return true;
  }), [doctors, q, spec, city]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-extrabold">{t("findDoctors")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{filtered.length} doctor{filtered.length === 1 ? "" : "s"} available</p>

        <Card className="mt-5 grid gap-3 p-4 shadow-card md:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className="h-11 pl-9" />
          </div>
          <Select value={spec} onValueChange={setSpec}>
            <SelectTrigger className="h-11"><SelectValue placeholder={t("specialization")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allSpecializations")}</SelectItem>
              {SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-11"><SelectValue placeholder={t("city")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCities")}</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {loading && <p className="col-span-full text-sm text-muted-foreground">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">No doctors match your filters.</p>
          )}
          {filtered.map(d => (
            <Card key={d.id} className="flex gap-4 p-5 shadow-card transition hover:shadow-elevated">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground">
                {d.profile_photo_url
                  ? <img src={d.profile_photo_url} alt="" className="h-full w-full object-cover" />
                  : <Stethoscope className="h-7 w-7" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-extrabold">{d.doctor_name}</div>
                <div className="truncate text-sm text-primary">{d.specialization}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{d.qualification} • {d.experience_years} yrs</div>
                <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{d.clinic_name}, {d.city}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center text-sm font-bold text-primary">
                    <IndianRupee className="h-4 w-4" />{d.consultation_fee}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/doctors/$id" params={{ id: d.id }}>{t("viewProfile")}</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/book/$doctorId" params={{ doctorId: d.id }}>{t("book2")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
