import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SPECIALIZATIONS, DAYS } from "@/lib/clinic";
import { upsertDoctorProfile, getMyDoctor } from "@/lib/doctor.functions";
import { Stethoscope, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor/onboarding")({
  component: OnboardingPage,
});

const schema = z.object({
  doctor_name: z.string().trim().min(2).max(100),
  specialization: z.string().min(2),
  qualification: z.string().trim().min(2).max(120),
  experience_years: z.coerce.number().int().min(0).max(80),
  clinic_name: z.string().trim().min(2).max(120),
  clinic_address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  consultation_fee: z.coerce.number().int().min(0).max(100000),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile"),
  email: z.string().trim().email(),
  profile_photo_url: z.string().trim().max(500).default(""),
  available_days: z.array(z.string()).min(1, "Select at least one day"),
  time_start: z.string().regex(/^\d{2}:\d{2}$/),
  time_end: z.string().regex(/^\d{2}:\d{2}$/),
  slot_minutes: z.coerce.number().int().min(5).max(120),
});

type FormValues = z.infer<typeof schema>;

function OnboardingPage() {
  const navigate = useNavigate();
  const upsert = useServerFn(upsertDoctorProfile);
  const fetchMine = useServerFn(getMyDoctor);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      doctor_name: "", specialization: "", qualification: "",
      experience_years: 0, clinic_name: "", clinic_address: "",
      city: "", state: "", consultation_fee: 300, phone: "", email: "",
      profile_photo_url: "",
      available_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
      time_start: "10:00", time_end: "14:00", slot_minutes: 15,
    },
  });

  useEffect(() => {
    (async () => {
      const me = await fetchMine();
      if (me) {
        // Already have a profile — go to status page or edit.
        if (me.verification_status === "approved") navigate({ to: "/doctor/dashboard" });
        else navigate({ to: "/doctor/pending" });
        return;
      }
      setLoading(false);
    })();
  }, [fetchMine, navigate]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await upsert({ data: values as any });
      toast.success("Profile submitted for review");
      navigate({ to: "/doctor/pending" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</main></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">Doctor onboarding</div>
            <h1 className="text-2xl font-extrabold">Complete your profile</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Once submitted, our team will review and approve your listing. You can edit it any time.</p>

        <Card className="mt-6 p-6 shadow-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="doctor_name" label="Doctor Name" form={form} placeholder="Dr. Anjali Verma" />
                <FormField control={form.control} name="specialization" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select…" /></SelectTrigger></FormControl>
                      <SelectContent>{SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Field name="qualification" label="Qualification" form={form} placeholder="MBBS, MD" />
                <Field name="experience_years" label="Years of experience" form={form} type="number" />
                <Field name="phone" label="Phone (10-digit)" form={form} placeholder="9876543210" />
                <Field name="email" label="Contact email" form={form} type="email" />
              </div>

              <div className="h-px bg-border" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="clinic_name" label="Clinic Name" form={form} />
                <Field name="consultation_fee" label="Consultation Fee (₹)" form={form} type="number" />
                <Field name="clinic_address" label="Clinic Address" form={form} className="sm:col-span-2" />
                <Field name="city" label="City" form={form} />
                <Field name="state" label="State" form={form} />
                <Field name="profile_photo_url" label="Profile photo URL (optional)" form={form} className="sm:col-span-2" placeholder="https://…" />
              </div>

              <div className="h-px bg-border" />
              <FormField control={form.control} name="available_days" render={() => (
                <FormItem>
                  <FormLabel>Available days</FormLabel>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {DAYS.map(d => (
                      <FormField key={d.value} control={form.control} name="available_days" render={({ field }) => {
                        const checked = (field.value ?? []).includes(d.value);
                        return (
                          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium">
                            <Checkbox checked={checked} onCheckedChange={(v) => {
                              const set = new Set(field.value ?? []);
                              if (v) set.add(d.value); else set.delete(d.value);
                              field.onChange(Array.from(set));
                            }} />
                            {d.label}
                          </label>
                        );
                      }} />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid gap-4 sm:grid-cols-3">
                <Field name="time_start" label="Start time (HH:MM)" form={form} placeholder="10:00" />
                <Field name="time_end" label="End time (HH:MM)" form={form} placeholder="14:00" />
                <Field name="slot_minutes" label="Slot minutes" form={form} type="number" />
              </div>

              <Button type="submit" size="lg" disabled={saving} className="w-full">
                <Save className="mr-2 h-4 w-4" />{saving ? "Submitting…" : "Submit for review"}
              </Button>
            </form>
          </Form>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function Field({ name, label, form, type = "text", placeholder, className }: { name: any; label: string; form: any; type?: string; placeholder?: string; className?: string }) {
  return (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className={className}>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input type={type} placeholder={placeholder} className="h-11" {...field} value={field.value ?? ""} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}
