import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CLINIC } from "@/lib/clinic";
import { useI18n } from "@/lib/i18n";
import { loadRazorpay } from "@/lib/razorpay";
import { createBookingOrder, verifyBookingPayment } from "@/lib/booking.functions";
import { supabase } from "@/integrations/supabase/client";
import { IndianRupee, MapPin, Stethoscope, Calendar as CalIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/book")({
  component: BookPage,
});

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function BookPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const createOrder = useServerFn(createBookingOrder);
  const verify = useServerFn(verifyBookingPayment);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [date, setDate] = useState<Date | undefined>(today);
  const [submitting, setSubmitting] = useState(false);

  async function handlePay() {
    if (!date) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: profile } = await supabase.from("profiles").select("full_name, mobile").eq("id", user.id).single();

      const order = await createOrder({ data: { appointmentDate: ymd(date), amount: CLINIC.consultationFee } });

      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: CLINIC.name,
        description: `Consultation with ${CLINIC.doctor.name}`,
        prefill: {
          name: profile?.full_name ?? "",
          email: user.email ?? "",
          contact: profile?.mobile ?? "",
        },
        theme: { color: "#2c5fdb" },
        handler: async (resp: any) => {
          try {
            toast.loading(t("bookingLoading"), { id: "verify" });
            const res = await verify({
              data: {
                appointmentId: order.appointmentId,
                paymentId: order.paymentId,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              },
            });
            toast.success(t("confirmed"), { id: "verify" });
            navigate({ to: "/confirmation/$id", params: { id: res.appointmentId } });
          } catch (err: any) {
            toast.error(err?.message ?? "Verification failed", { id: "verify" });
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not start payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-extrabold">{t("book")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{CLINIC.doctor.name} • {CLINIC.doctor.specialization}</p>

        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_320px]">
          <Card className="p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <CalIcon className="h-4 w-4 text-primary" /> {t("selectDate")}
            </h2>
            <div className="mt-3 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < today}
                className="pointer-events-auto rounded-md border p-3"
              />
            </div>
          </Card>

          <Card className="p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold">{CLINIC.doctor.name}</div>
                <div className="truncate text-xs text-muted-foreground">{CLINIC.doctor.specialization}</div>
              </div>
            </div>
            <div className="my-4 h-px bg-border" />
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{CLINIC.address}</span>
            </div>
            <div className="my-4 h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{t("consultationFee")}</span>
              <span className="flex items-center text-xl font-extrabold text-primary">
                <IndianRupee className="h-5 w-5" />{CLINIC.consultationFee}
              </span>
            </div>
            <Button
              size="lg"
              className="mt-5 h-12 w-full text-base font-bold"
              disabled={!date || submitting}
              onClick={handlePay}
            >
              {submitting ? "…" : t("payAndBook")}
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Secured by Razorpay • Token assigned after payment success
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
