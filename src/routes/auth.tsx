import { createFileRoute, useNavigate, Link, useRouterState } from "@tanstack/react-router";
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

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: `Sign in — ${PLATFORM.name}` },
    { name: "description", content: `Doctor and super admin sign-in for ${PLATFORM.name}. Patients can book without an account.` },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  useRouterState({ select: () => null }); // keep router subscribed; unused

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(fd.get("email") ?? ""),
        password: String(fd.get("password") ?? ""),
      });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate({ to: "/doctor/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const email = String(fd.get("email") ?? "");
      const password = String(fd.get("password") ?? "");
      const full_name = String(fd.get("full_name") ?? "");
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name } },
      });
      if (error) throw error;
      toast.success("Account created — complete your doctor profile.");
      navigate({ to: "/doctor/onboarding" });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">For Doctors & Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">{PLATFORM.name}</p>
        </div>

        <Card className="mt-6 p-6 shadow-card">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Doctor sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required className="mt-1 h-11" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required minLength={6} className="mt-1 h-11" />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full text-base font-semibold">
                  {loading ? "…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" name="full_name" required minLength={2} className="mt-1 h-11" />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required className="mt-1 h-11" />
                </div>
                <div>
                  <Label htmlFor="su-password">Password</Label>
                  <Input id="su-password" name="password" type="password" required minLength={6} className="mt-1 h-11" />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full text-base font-semibold">
                  {loading ? "…" : "Create doctor account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Patients book directly — no account needed.{" "}
            <Link to="/doctors" className="font-semibold text-primary hover:underline">Find a doctor →</Link>
          </p>
        </Card>

        <Link to="/" className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      </main>
      <Footer />
    </div>
  );
}
