import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "patient" | "staff" | "doctor";

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (!cancelled) { setRoles([]); setLoading(false); } return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (!cancelled) {
        setRoles((data ?? []).map(r => r.role as Role));
        setLoading(false);
      }
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return { roles, loading, hasRole: (r: Role) => roles.includes(r) };
}
