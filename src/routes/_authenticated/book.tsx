import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, IndianRupee, MapPin, Stethoscope } from "lucide-react";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { CLINIC } from "@/lib/clinic";
import { useI18n } from "@/lib/i18n";
import { loadRazorpay } from "@/lib/razorpay";
import { createBookingOrder, verifyBookingPayment } from "@/lib/booking.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/book")({
  component: BookPage,
});

const TIME_SLOTS = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const schema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .regex(/^[A-Za-z\u0900-\u097F\s.'-]+$/, "Name can only contain letters"),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  age: z.coerce
    .number({ invalid_type_error: "Age is required" })
    .int("Age must be a whole number")
    .min(1, "Age must be at least 1")
    .max(120, "Age must be 120 or less"),
  gender: z.enum(["male", "female", "other"], { required_error: "Select a gender" }),
  appointment_date: z.date({ required_error: "Pick an appointment date" }),
  appointment_time: z.string().min(1, "Select an appointment time"),
});

type FormValues = z.infer<typeof schema>;

function BookPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const createOrder = useServerFn(createBookingOrder);
  const verify = useServerFn(verifyBookingPayment);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      full_name: "",
      mobile: "",
      age: undefined as unknown as number,
      gender: undefined as unknown as "male",
      appointment_date: today,
      appointment_time: "",
    },
  });

  // Prefill from profile
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, mobile, age, gender")
        .eq("id", user.id)
        .single();
      if (!profile) return;
      form.reset({
        full_name: profile.full_name ?? "",
        mobile: profile.mobile ?? "",
        age: (profile.age ?? undefined) as number,
        gender: (profile.gender ?? undefined) as "male" | "female" | "other",
        appointment_date: today,
        appointment_time: "",
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Persist patient details
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          mobile: values.mobile,
          age: values.age,
          gender: values.gender,
        })
        .eq("id", user.id);
      if (profErr) throw profErr;

      const order = await createOrder({
        data: {
          appointmentDate: ymd(values.appointment_date),
          amount: CLINIC.consultationFee,
        },
      });

      // Save chosen slot time onto the appointment
      await supabase
        .from("appointments")
        .update({ estimated_time: values.appointment_time })
        .eq("id", order.appointmentId);

      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: CLINIC.name,
        description: `Consultation with ${CLINIC.doctor.name}`,
        prefill: {
          name: values.full_name,
          email: user.email ?? "",
          contact: values.mobile,
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
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-extrabold">{t("book")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {CLINIC.doctor.name} • {CLINIC.doctor.specialization}
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_320px]">
          <Card className="p-5 shadow-card md:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fullName")}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ramesh Kumar" autoComplete="name" maxLength={100} className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("mobile")}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            placeholder="9876543210"
                            autoComplete="tel-national"
                            maxLength={10}
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("age")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={120}
                            placeholder="32"
                            className="h-11"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("gender")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">{t("male")}</SelectItem>
                          <SelectItem value="female">{t("female")}</SelectItem>
                          <SelectItem value="other">{t("other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="appointment_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t("appointmentDate")}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "h-11 justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>{t("selectDate")}</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(d) => d < today}
                              initialFocus
                              className={cn("pointer-events-auto p-3")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appointment_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("appointmentTime")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIME_SLOTS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full text-base font-bold"
                  disabled={submitting}
                >
                  {submitting ? "…" : t("payAndBook")}
                </Button>
              </form>
            </Form>
          </Card>

          <Card className="h-fit p-5 shadow-card">
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
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Secured by Razorpay • Token assigned after payment success
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
