import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMyDoctor } from "@/lib/doctor.functions";
import { Clock, XCircle, Edit } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor/pending")({
  component: PendingPage,
});

function PendingPage() {
  const fetchMine = useServerFn(getMyDoctor);
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await fetchMine();
      if (!me) { navigate({ to: "/doctor/onboarding" }); return; }
      if (me.verification_status === "approved") { navigate({ to: "/doctor/dashboard" }); return; }
      setDoc(me);
      setLoading(false);
    })();
  }, [fetchMine, navigate]);

  if (loading) return null;
  const rejected = doc?.verification_status === "rejected";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-8 text-center shadow-elevated">
          <div className={"mx-auto grid h-16 w-16 place-items-center rounded-full " + (rejected ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning-foreground")}>
            {rejected ? <XCircle className="h-9 w-9" /> : <Clock className="h-9 w-9" />}
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">{rejected ? "Registration rejected" : "Pending review"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {rejected
              ? "Your application was not approved. Please update your profile or contact support."
              : "Thanks for registering! Our team will review your profile shortly."}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/doctor/profile"><Edit className="mr-2 h-4 w-4" />Edit profile</Link>
            </Button>
            <Button variant="outline" asChild><Link to="/">Back to home</Link></Button>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
