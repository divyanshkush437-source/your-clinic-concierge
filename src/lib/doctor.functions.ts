import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const profileSchema = z.object({
  doctor_name: z.string().trim().min(2).max(100),
  specialization: z.string().trim().min(2).max(80),
  qualification: z.string().trim().min(2).max(120),
  experience_years: z.number().int().min(0).max(80),
  clinic_name: z.string().trim().min(2).max(120),
  clinic_address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  consultation_fee: z.number().int().min(0).max(100000),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile"),
  email: z.string().trim().email().max(200),
  profile_photo_url: z.string().trim().max(500).default(""),
  available_days: z.array(z.enum(["mon","tue","wed","thu","fri","sat","sun"])).min(1),
  time_start: z.string().regex(/^\d{2}:\d{2}$/),
  time_end: z.string().regex(/^\d{2}:\d{2}$/),
  slot_minutes: z.number().int().min(5).max(120),
});

/** Insert or update the signed-in user's doctor profile. Always returns the row. */
export const upsertDoctorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    // upsert by user_id
    const { data: existing } = await supabase.from("doctors").select("id").eq("user_id", userId).maybeSingle();
    if (existing) {
      const { data: row, error } = await supabase
        .from("doctors")
        .update(data)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("doctors")
      .insert({ ...data, user_id: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Returns the signed-in user's doctor row, or null. */
export const getMyDoctor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("doctors").select("*").eq("user_id", context.userId).maybeSingle();
    return data ?? null;
  });

/** Admin: set verification status. */
export const setDoctorVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    doctorId: z.string().uuid(),
    status: z.enum(["approved", "rejected", "pending"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("doctors").update({ verification_status: data.status }).eq("id", data.doctorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Calls the bootstrap_admin_if_none() DB function — first signed-in user becomes admin. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("bootstrap_admin_if_none");
    if (error) throw new Error(error.message);
    return { isAdmin: data === true };
  });

/** Whether the current user has 'admin' role. */
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: data === true };
  });
