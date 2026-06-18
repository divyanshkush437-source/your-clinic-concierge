import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLINIC } from "@/lib/clinic";
import { useI18n } from "@/lib/i18n";
import { Clock, IndianRupee, MapPin, Phone, Calendar, Activity, ShieldCheck, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${CLINIC.name} — Book Appointments & Track Queue Live` },
      { name: "description", content: `Book appointments with ${CLINIC.doctor.name} at ${CLINIC.name}. Pay online, get a token, track your turn live.` },
      { property: "og:title", content: `${CLINIC.name}` },
      { property: "og:description", content: `Online appointments with ${CLINIC.doctor.name}. Skip the wait.` },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero opacity-95" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white_0%,transparent_55%)] opacity-20" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="text-primary-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Activity className="h-3.5 w-3.5" /> Live queue tracking
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              {t("tagline")}
            </h1>
            <p className="mt-4 max-w-md text-base text-primary-foreground/85 md:text-lg">
              Book your slot online, pay ₹{CLINIC.consultationFee} in advance, and get a token instantly.
              No more waiting in long queues.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 shadow-elevated">
                <Link to="/book"><Calendar className="mr-1.5 h-5 w-5" /> {t("bookNow")}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10">
                <Link to="/queue">{t("viewLive")}</Link>
              </Button>
            </div>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-xs">
              <Stat icon={ShieldCheck} label="Secure" sub="Razorpay" />
              <Stat icon={Clock} label={CLINIC.slotMinutes + " min"} sub="per visit" />
              <Stat icon={IndianRupee} label={"₹" + CLINIC.consultationFee} sub="consult" />
            </div>
          </div>

          {/* Doctor card */}
          <Card className="bg-card-gradient shadow-elevated p-6 md:p-7">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Stethoscope className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">Today's Doctor</div>
                <div className="truncate text-xl font-extrabold">{CLINIC.doctor.name}</div>
                <div className="truncate text-sm text-muted-foreground">{CLINIC.doctor.specialization}</div>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <Row icon={Clock} title="Hours" value={CLINIC.hours} />
              <Row icon={MapPin} title="Address" value={CLINIC.address} />
              <Row icon={Phone} title="Phone" value={CLINIC.phone} />
              <Row icon={IndianRupee} title={t("consultationFee")} value={`₹${CLINIC.consultationFee}`} />
            </div>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-extrabold md:text-3xl">How it works</h2>
        <p className="mt-2 text-center text-muted-foreground">Three quick steps. No paperwork.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: 1, title: "Pick a date", body: "Choose a date and confirm your details." },
            { n: 2, title: "Pay online", body: `Pay ₹${CLINIC.consultationFee} securely via Razorpay.` },
            { n: 3, title: "Get token + track", body: "Receive your token instantly and watch the queue update live." },
          ].map(s => (
            <Card key={s.n} className="p-6 shadow-card">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft font-bold text-primary">{s.n}</div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <Card className="flex flex-col items-center gap-4 bg-primary p-8 text-center text-primary-foreground shadow-elevated md:flex-row md:justify-between md:text-left">
          <div>
            <h3 className="text-2xl font-extrabold">Ready to skip the queue?</h3>
            <p className="mt-1 text-primary-foreground/85">Book your appointment in under a minute.</p>
          </div>
          <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
            <Link to="/book">{t("bookNow")}</Link>
          </Button>
        </Card>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ icon: Icon, label, sub }: { icon: any; label: string; sub: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
      <Icon className="h-4 w-4 opacity-90" />
      <div className="mt-1 text-sm font-bold">{label}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-75">{sub}</div>
    </div>
  );
}

function Row({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
