import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PLATFORM, SPECIALIZATIONS } from "@/lib/clinic";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Search, Stethoscope, Calendar, ShieldCheck, Activity, IndianRupee, MapPin, Navigation } from "lucide-react";

type FeaturedDoctor = {
  id: string;
  doctor_name: string;
  specialization: string;
  clinic_name: string;
  clinic_address: string;
  city: string;
  consultation_fee: number;
  experience_years: number;
  profile_photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${PLATFORM.name} — ${PLATFORM.tagline}` },
      { name: "description", content: "Find verified doctors near you, view consultation fees, book appointments online, and get a token instantly — no signup needed." },
      { property: "og:title", content: PLATFORM.name },
      { property: "og:description", content: PLATFORM.tagline },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [featured, setFeatured] = useState<FeaturedDoctor[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("doctors")
        .select("id, doctor_name, specialization, clinic_name, clinic_address, city, consultation_fee, experience_years, profile_photo_url, latitude, longitude")
        .eq("verification_status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      setFeatured((data ?? []) as FeaturedDoctor[]);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero opacity-95" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white_0%,transparent_55%)] opacity-20" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center text-primary-foreground md:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Activity className="h-3.5 w-3.5" /> Live queue tracking
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            {t("tagline")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/85 md:text-lg">
            Search verified doctors across India, book in under a minute, and walk in with a token already in hand.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/doctors", search: { q: q || undefined } as any }); }}
            className="mx-auto mt-7 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-elevated"
          >
            <Search className="ml-2 h-5 w-5 text-muted-foreground" />
            <Input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 flex-1 border-0 bg-transparent text-foreground focus-visible:ring-0"
            />
            <Button type="submit" className="h-11">{t("findDoctors")}</Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-extrabold md:text-3xl">Browse by specialization</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {SPECIALIZATIONS.slice(0, 10).map((s) => (
            <Link
              key={s}
              to="/doctors"
              search={{ specialization: s } as any}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card transition hover:border-primary hover:shadow-elevated"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">{s}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-center text-2xl font-extrabold md:text-3xl">How it works</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: 1, icon: Search, title: "Find a doctor", body: "Search by name, specialization or city." },
            { n: 2, icon: Calendar, title: "Pick a slot & pay", body: "Book online with secure payment." },
            { n: 3, icon: ShieldCheck, title: "Get your token", body: "Skip the queue with a live-tracked token." },
          ].map(s => (
            <Card key={s.n} className="p-6 shadow-card">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <Card className="flex flex-col items-center gap-4 bg-primary p-8 text-center text-primary-foreground shadow-elevated md:flex-row md:justify-between md:text-left">
          <div>
            <h3 className="text-2xl font-extrabold">Are you a doctor?</h3>
            <p className="mt-1 text-primary-foreground/85">List your clinic, manage your queue, and grow your practice.</p>
          </div>
          <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
            <Link to="/auth">List your practice</Link>
          </Button>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
