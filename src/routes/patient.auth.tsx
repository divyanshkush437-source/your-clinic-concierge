import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM } from "@/lib/clinic";
import { Loader2, Phone, ShieldCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/patient/auth")({
  head: () => ({
    meta: [
      { title: `Patient sign in — ${PLATFORM.name}` },
      { name: "description", content: `Sign in with your mobile number to track your tokens and appointments at ${PLATFORM.name}.` },
    ],
  }),
  component: PatientAuthPage,
});

const mobileSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");
const detailsSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  age: z.coerce.number().int().min(1, "Enter a valid age").max(120),
  gender: z.enum(["male", "female", "other"], { required_error: "Select a gender" }),
});

type Step = "mobile" | "otp";

function PatientAuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("mobile");
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  // Optional details for new accounts — collected up-front, applied after verify
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  const phoneE164 = mobile ? `+91${mobile}` : "";

  async function sendOtp(opts?: { resend?: boolean }) {
    try {
      const mob = mobileSchema.parse(mobile);
      const details = detailsSchema.safeParse({ full_name: fullName, age, gender });
      if (!details.success) {
        toast.error(details.error.issues[0]?.message ?? "Please fill all fields");
        return;
      }
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${mob}`,
        options: {
          channel: "sms",
          // Stored on auth.users.raw_user_meta_data — used by handle_new_user trigger
          data: {
            full_name: details.data.full_name,
            mobile: mob,
            age: details.data.age,
            gender: details.data.gender,
          },
        },
      });
      if (error) throw error;
      toast.success(opts?.resend ? "OTP resent" : "OTP sent to your mobile");
      setStep("otp");
      setResendIn(30);
    } catch (err: any) {
      const msg = err?.message ?? "Could not send OTP";
      // Friendlier message when SMS provider isn't configured
      if (/provider|sms|not enabled|unsupported/i.test(msg)) {
        toast.error("SMS provider isn't configured for this clinic yet. Please contact support.");
      } else {
        toast.error(msg);
      }
    } finally { setLoading(false); }
  }

  async function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const code = otpSchema.parse(otp);
      setLoading(true);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneE164,
        token: code,
        type: "sms",
      });
      if (error) throw error;
      const uid = data.user?.id;
      if (uid) {
        // Ensure profile fields are saved (handle_new_user only sets name+mobile)
        await supabase.from("profiles").upsert({
          id: uid,
          full_name: fullName.trim(),
          mobile,
          age: Number(age),
          gender,
        });
        // Link any past walk-in patient rows for this phone
        try { await supabase.rpc("claim_patient_records" as any, { _phone: mobile } as any); } catch {}
      }
      toast.success("Signed in");
      navigate({ to: "/patient/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "Invalid or expired OTP");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            {step === "mobile" ? <Phone className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold">
            {step === "mobile" ? "Patient sign in" : "Verify OTP"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "mobile"
              ? "Enter your mobile number — we'll send a one-time password"
              : `Enter the 6-digit code sent to +91 ${mobile}`}
          </p>
        </div>

        <Card className="mt-6 p-6 shadow-card">
          {step === "mobile" ? (
            <form
              onSubmit={(e) => { e.preventDefault(); sendOtp(); }}
              className="space-y-4"
              noValidate
            >
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name" autoComplete="name" required minLength={2} maxLength={100}
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 h-11" placeholder="Ramesh Kumar"
                />
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-2">
                <div>
                  <Label>Code</Label>
                  <div className="mt-1 grid h-11 place-items-center rounded-md border bg-secondary text-sm font-semibold">+91</div>
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile number</Label>
                  <Input
                    id="mobile" type="tel" inputMode="numeric" autoComplete="tel-national"
                    maxLength={10} required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="mt-1 h-11" placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age" type="number" inputMode="numeric" min={1} max={120} required
                    value={age} onChange={(e) => setAge(e.target.value)}
                    className="mt-1 h-11" placeholder="32"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={(v) => setGender(v as any)}>
                    <SelectTrigger id="gender" className="mt-1 h-11"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="h-11 w-full text-base font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                New here? An account is created automatically after OTP verification.
              </p>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="otp">6-digit OTP</Label>
                <Input
                  id="otp" inputMode="numeric" autoComplete="one-time-code"
                  maxLength={6} required autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-1 h-12 text-center text-2xl font-bold tracking-[0.5em]"
                  placeholder="••••••"
                />
              </div>

              <Button type="submit" disabled={loading || otp.length !== 6} className="h-11 w-full text-base font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & continue"}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setStep("mobile"); setOtp(""); }}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Change number
                </button>
                <button
                  type="button"
                  disabled={resendIn > 0 || loading}
                  onClick={() => sendOtp({ resend: true })}
                  className="font-semibold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 border-t pt-4 text-center text-xs text-muted-foreground">
            Are you a doctor or admin?{" "}
            <Link to="/auth" className="font-semibold text-primary hover:underline">Sign in here →</Link>
          </p>
        </Card>

        <Link to="/" className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      </main>
      <Footer />
    </div>
  );
}
