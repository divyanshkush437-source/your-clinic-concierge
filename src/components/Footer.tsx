import { CLINIC } from "@/lib/clinic";
import { Phone, MapPin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <h3 className="text-base font-bold">{CLINIC.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{CLINIC.tagline}</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{CLINIC.address}</span></div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-primary" /><span>{CLINIC.phone}</span></div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-primary" /><span>{CLINIC.email}</span></div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{CLINIC.hours}</p>
          <p className="mt-3 text-xs">© {new Date().getFullYear()} {CLINIC.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
