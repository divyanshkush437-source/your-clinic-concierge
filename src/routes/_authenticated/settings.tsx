import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Save, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some(r => r.role === "staff")) throw redirect({ to: "/dashboard" });
  },
  component: SettingsPage,
});

type Form = {
  doctor_name: string;
  consultation_fee: number;
  clinic_timing: string;
  max_patients_per_day: number;
};

function SettingsPage() {
  const [form, setForm] = useState<Form>({
    doctor_name: "",
    consultation_fee: 300,
    clinic_timing: "",
    max_patients_per_day: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("clinic_settings")
        .select("doctor_name, consultation_fee, clinic_timing, max_patients_per_day")
        .eq("id", true)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) setForm(data as Form);
      setLoading(false);
    })();
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.doctor_name.trim() || form.doctor_name.trim().length < 2) e.doctor_name = "Enter doctor name (min 2 chars)";
    if (!Number.isFinite(form.consultation_fee) || form.consultation_fee < 0 || form.consultation_fee > 100000) e.consultation_fee = "Fee must be 0–100000";
    if (!form.clinic_timing.trim()) e.clinic_timing = "Enter clinic timing";
    if (!Number.isInteger(form.max_patients_per_day) || form.max_patients_per_day < 1 || form.max_patients_per_day > 500) e.max_patients_per_day = "1–500 patients";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const { error } = await supabase
      .from("clinic_settings")
      .update({
        doctor_name: form.doctor_name.trim(),
        consultation_fee: form.consultation_fee,
        clinic_timing: form.clinic_timing.trim(),
        max_patients_per_day: form.max_patients_per_day,
      })
      .eq("id", true);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <SettingsIcon className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">Admin</div>
            <h1 className="text-2xl font-extrabold">Clinic Settings</h1>
          </div>
        </div>

        <Card className="mt-6 p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="doctor_name">Doctor Name</Label>
                <Input
                  id="doctor_name"
                  value={form.doctor_name}
                  onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))}
                  placeholder="Dr. Anjali Verma"
                />
                {errors.doctor_name && <p className="text-xs font-medium text-destructive">{errors.doctor_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultation_fee">Consultation Fee (₹)</Label>
                <Input
                  id="consultation_fee"
                  type="number"
                  min={0}
                  value={form.consultation_fee}
                  onChange={e => setForm(f => ({ ...f, consultation_fee: Number(e.target.value) }))}
                />
                {errors.consultation_fee && <p className="text-xs font-medium text-destructive">{errors.consultation_fee}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_timing">Clinic Timing</Label>
                <Input
                  id="clinic_timing"
                  value={form.clinic_timing}
                  onChange={e => setForm(f => ({ ...f, clinic_timing: e.target.value }))}
                  placeholder="Mon – Sat • 10:00 AM – 2:00 PM, 5:00 PM – 8:00 PM"
                />
                {errors.clinic_timing && <p className="text-xs font-medium text-destructive">{errors.clinic_timing}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_patients_per_day">Daily Patient Limit</Label>
                <Input
                  id="max_patients_per_day"
                  type="number"
                  min={1}
                  value={form.max_patients_per_day}
                  onChange={e => setForm(f => ({ ...f, max_patients_per_day: Number(e.target.value) }))}
                />
                {errors.max_patients_per_day && <p className="text-xs font-medium text-destructive">{errors.max_patients_per_day}</p>}
              </div>

              <Button onClick={save} disabled={saving} size="lg" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
