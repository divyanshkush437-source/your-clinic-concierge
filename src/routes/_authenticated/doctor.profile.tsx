import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SPECIALIZATIONS, DAYS } from "@/lib/clinic";
import { upsertDoctorProfile, getMyDoctor } from "@/lib/doctor.functions";
import { Save, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor/profile")({
  component: ProfilePage,
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
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
  email: z.string().trim().email(),
  profile_photo_url: z.string().trim().max(500).default(""),
  available_days: z.array(z.string()).min(1),
  time_start: z.string().regex(/^\d{2}:\d{2}$/),
  time_end: z.string().regex(/^\d{2}:\d{2}$/),
  slot_minutes: z.coerce.number().int().min(5).max(120),
});
type FormValues = z.infer<typeof schema>;

function ProfilePage() {
  const navigate = useNavigate();
  const upsert = useServerFn(upsertDoctorProfile);
  const fetchMine = useServerFn(getMyDoctor);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("pending");

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    (async () => {
      const me = await fetchMine();
      if (!me) { navigate({ to: "/doctor/onboarding" }); return; }
      form.reset(me as any);
      setStatus(me.verification_status);
      setLoading(false);
    })();
  }, [fetchMine, form, navigate]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await upsert({ data: values as any });
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</main></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/doctor/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">Edit profile</h1>
          <span className={"rounded-full px-3 py-1 text-xs font-bold " + (status === "approved" ? "bg-success/15 text-success" : status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning-foreground")}>
            {status}
          </span>
        </div>

        <Card className="mt-6 p-6 shadow-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="doctor_name" label="Doctor Name" form={form} />
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
                <Field name="qualification" label="Qualification" form={form} />
                <Field name="experience_years" label="Years of experience" form={form} type="number" />
                <Field name="phone" label="Phone (10-digit)" form={form} />
                <Field name="email" label="Contact email" form={form} type="email" />
              </div>

              <div className="h-px bg-border" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="clinic_name" label="Clinic Name" form={form} />
                <Field name="consultation_fee" label="Consultation Fee (₹)" form={form} type="number" />
                <Field name="clinic_address" label="Clinic Address" form={form} className="sm:col-span-2" />
                <Field name="city" label="City" form={form} />
                <Field name="state" label="State" form={form} />
                <Field name="profile_photo_url" label="Profile photo URL" form={form} className="sm:col-span-2" />
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
                <Field name="time_start" label="Start time (HH:MM)" form={form} />
                <Field name="time_end" label="End time (HH:MM)" form={form} />
                <Field name="slot_minutes" label="Slot minutes" form={form} type="number" />
              </div>

              <Button type="submit" size="lg" disabled={saving} className="w-full">
                <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save profile"}
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
