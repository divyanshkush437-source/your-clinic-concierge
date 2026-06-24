import { PLATFORM } from "@/lib/clinic";
import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <h3 className="text-base font-bold">{PLATFORM.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{PLATFORM.tagline}</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-primary" /><span>{PLATFORM.email}</span></div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="text-xs">© {new Date().getFullYear()} {PLATFORM.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
