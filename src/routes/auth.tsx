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
import { useI18n } from "@/lib/i18n";
import { CLINIC } from "@/lib/clinic";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — " + CLINIC.name },
    { name: "description", content: "Sign in or create an account to book appointments at " + CLINIC.name + "." },
  ]}),
  component: AuthPage,
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Name is too short").max(100),
  mobile: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid mobile number"),
  age: z.number().int().min(1).max(120).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().max(300).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be 6+ characters").max(72),
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.parse({
          full_name: String(fd.get("full_name") ?? ""),
          mobile: String(fd.get("mobile") ?? ""),
          age: fd.get("age") ? Number(fd.get("age")) : undefined,
          gender: (fd.get("gender") || undefined) as any,
          address: String(fd.get("address") ?? ""),
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
        });
        const { data, error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.full_name, mobile: parsed.mobile },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").update({
            full_name: parsed.full_name,
            mobile: parsed.mobile,
            age: parsed.age ?? null,
            gender: parsed.gender ?? null,
            address: parsed.address || null,
          }).eq("id", data.user.id);
        }
        toast.success("Account created!");
        navigate({ to: "/book" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">{mode === "signin" ? t("welcomeBack") : t("createAccount")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{CLINIC.name}</p>
        </div>

        <Card className="mt-6 p-6 shadow-card">
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <Field label={t("fullName")} name="full_name" required maxLength={100} />
                <Field label={t("mobile")} name="mobile" type="tel" required />
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("age")} name="age" type="number" min={1} max={120} />
                  <div>
                    <Label htmlFor="gender">{t("gender")}</Label>
                    <select id="gender" name="gender" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="">—</option>
                      <option value="male">{t("male")}</option>
                      <option value="female">{t("female")}</option>
                      <option value="other">{t("other")}</option>
                    </select>
                  </div>
                </div>
                <Field label={t("address")} name="address" />
              </>
            )}
            <Field label={t("email")} name="email" type="email" required />
            <Field label={t("password")} name="password" type="password" required minLength={6} />
            <Button type="submit" disabled={loading} className="h-11 w-full text-base font-semibold">
              {loading ? "…" : mode === "signin" ? t("signIn") : t("signUp")}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? t("needAccount") : t("alreadyHaveAccount")}{" "}
            <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-primary hover:underline">
              {mode === "signin" ? t("signUp") : t("signIn")}
            </button>
          </div>
        </Card>

        <Link to="/" className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      </main>
      <Footer />
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...rest } = props;
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="mt-1 h-11" {...rest} />
    </div>
  );
}
