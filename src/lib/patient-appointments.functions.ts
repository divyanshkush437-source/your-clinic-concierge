import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const mobileSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const getAppointmentsByMobile = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ mobile: mobileSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: patients } = await supabaseAdmin
      .from("patients")
      .select("id, full_name")
      .eq("mobile", data.mobile);

    const ids = (patients ?? []).map((p) => p.id);
    if (ids.length === 0) return { appointments: [] as any[] };

    const { data: appts } = await supabaseAdmin
      .from("appointments")
      .select("id, doctor_id, patient_id, appointment_date, estimated_time, token_number, status, consultation_fee, created_at")
      .in("patient_id", ids)
      .order("appointment_date", { ascending: false })
      .order("token_number", { ascending: true, nullsFirst: false });

    const docIds = Array.from(new Set((appts ?? []).map((a) => a.doctor_id).filter(Boolean) as string[]));
    const { data: docs } = docIds.length
      ? await supabaseAdmin.from("doctors").select("id, doctor_name, specialization, clinic_name, clinic_address, city").in("id", docIds)
      : { data: [] as any[] };
    const dMap = new Map((docs ?? []).map((d) => [d.id, d]));
    const pMap = new Map((patients ?? []).map((p) => [p.id, p]));

    return {
      appointments: (appts ?? []).map((a) => ({
        ...a,
        doctor: a.doctor_id ? (dMap.get(a.doctor_id) as any) ?? null : null,
        patient_name: (pMap.get(a.patient_id) as any)?.full_name ?? null,
      })),
    };
  });

export const cancelAppointmentByMobile = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      appointmentId: z.string().uuid(),
      mobile: mobileSchema,
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appt, error } = await supabaseAdmin
      .from("appointments")
      .select("id, status, appointment_date, estimated_time, patient_id, patients!inner(mobile)")
      .eq("id", data.appointmentId)
      .single();
    if (error || !appt) throw new Error("Appointment not found");

    const patientMobile = (appt as any).patients?.mobile;
    if (patientMobile !== data.mobile) throw new Error("Mobile number does not match this appointment");

    if (["completed", "cancelled", "consulting"].includes(appt.status)) {
      throw new Error(`Cannot cancel an appointment that is ${appt.status}`);
    }

    // Block cancellation after the scheduled appointment date/time
    const todayYmd = new Date().toISOString().slice(0, 10);
    if (appt.appointment_date < todayYmd) throw new Error("Appointment already passed");
    if (appt.appointment_date === todayYmd && appt.estimated_time) {
      const [hh, mm] = appt.estimated_time.split(":").map(Number);
      if (!Number.isNaN(hh)) {
        const now = new Date();
        const apptMinutes = (hh ?? 0) * 60 + (mm ?? 0);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (nowMinutes >= apptMinutes) throw new Error("Appointment time has passed");
      }
    }

    const { error: upErr } = await supabaseAdmin
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", data.appointmentId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true };
  });
