import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CLINIC } from "@/lib/clinic";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Staff Sign in — " + CLINIC.name },
    { name: "description", content: "Clinic staff and doctor sign in for " + CLINIC.name + "." },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">Staff Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">{CLINIC.name} • Clinic staff & doctor only</p>
        </div>

        <Card className="mt-6 p-6 shadow-card">
          <form onSubmit={onSubmit} className="space-y-4">
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

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Patients can book appointments directly — no account needed.{" "}
            <Link to="/book" className="font-semibold text-primary hover:underline">Book now →</Link>
          </p>
        </Card>

        <Link to="/" className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      </main>
      <Footer />
    </div>
  );
}
