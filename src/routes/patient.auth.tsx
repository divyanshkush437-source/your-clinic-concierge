import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM } from "@/lib/clinic";

export const Route = createFileRoute("/patient/auth")({
  head: () => ({
    meta: [
      { title: `Patient sign in — ${PLATFORM.name}` },
      { name: "description", content: `Sign in to track your appointments, tokens and queue at ${PLATFORM.name}.` },
    ],
  }),
  component: PatientAuthPage,
});

function PatientAuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  async function claimByPhone(phone: string) {
    if (!phone) return;
    try { await supabase.rpc("claim_patient_records" as any, { _phone: phone } as any); } catch {}
  }

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(fd.get("email") ?? ""),
        password: String(fd.get("password") ?? ""),
      });
      if (error) throw error;
      const uid = data.user?.id;
      if (uid) {
        const { data: prof } = await supabase.from("profiles").select("mobile").eq("id", uid).maybeSingle();
        if (prof?.mobile) await claimByPhone(prof.mobile);
      }
      toast.success("Welcome back!");
      navigate({ to: "/patient/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign in failed");
    } finally { setLoading(false); }
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const email = String(fd.get("email") ?? "");
      const password = String(fd.get("password") ?? "");
      const full_name = String(fd.get("full_name") ?? "");
      const mobile = String(fd.get("mobile") ?? "");
      if (!/^[6-9]\d{9}$/.test(mobile)) throw new Error("Enter a valid 10-digit mobile number");

      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name, mobile } },
      });
      if (error) throw error;

      const uid = data.user?.id;
      if (uid) {
        await supabase.from("profiles").upsert({ id: uid, full_name, mobile });
        await claimByPhone(mobile);
      }
      toast.success("Account created");
      navigate({ to: "/patient/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign up failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">Patient sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your tokens, queue position and history</p>
        </div>

        <Card className="mt-6 p-6 shadow-card">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4">
                <div>
                  <Label htmlFor="p-email">Email</Label>
                  <Input id="p-email" name="email" type="email" required className="mt-1 h-11" />
                </div>
                <div>
                  <Label htmlFor="p-password">Password</Label>
                  <Input id="p-password" name="password" type="password" required minLength={6} className="mt-1 h-11" />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full text-base font-semibold">
                  {loading ? "…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4">
                <div>
                  <Label htmlFor="p-name">Full name</Label>
                  <Input id="p-name" name="full_name" required minLength={2} className="mt-1 h-11" />
                </div>
                <div>
                  <Label htmlFor="p-mobile">Mobile (10 digits)</Label>
                  <Input id="p-mobile" name="mobile" type="tel" inputMode="numeric" maxLength={10} required className="mt-1 h-11" />
                  <p className="mt-1 text-[11px] text-muted-foreground">We use this to link any walk-in bookings to your account.</p>
                </div>
                <div>
                  <Label htmlFor="su-p-email">Email</Label>
                  <Input id="su-p-email" name="email" type="email" required className="mt-1 h-11" />
                </div>
                <div>
                  <Label htmlFor="su-p-password">Password</Label>
                  <Input id="su-p-password" name="password" type="password" required minLength={6} className="mt-1 h-11" />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full text-base font-semibold">
                  {loading ? "…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Booking without an account? <Link to="/doctors" className="font-semibold text-primary hover:underline">Find a doctor →</Link>
          </p>
        </Card>

        <Link to="/" className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      </main>
      <Footer />
    </div>
  );
}
