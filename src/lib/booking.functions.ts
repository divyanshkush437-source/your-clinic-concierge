import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PUBLIC_RAZORPAY_KEY = () => process.env.RAZORPAY_KEY_ID ?? "";

export const getRazorpayPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { keyId: PUBLIC_RAZORPAY_KEY() };
});

/**
 * Creates an appointment row (status=booked, no token yet), a pending payment row,
 * and a Razorpay order. Returns ids + order details for the client checkout.
 */
export const createBookingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      amount: z.number().int().positive().max(100000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Payment provider not configured");

    const { supabase, userId } = context;

    // 1. Insert appointment (no token yet — assigned after payment)
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .insert({
        patient_id: userId,
        appointment_date: data.appointmentDate,
        status: "booked",
        consultation_fee: data.amount,
      })
      .select("id")
      .single();
    if (apptErr || !appt) throw new Error(apptErr?.message || "Could not create appointment");

    // 2. Insert payment (pending)
    const { data: pay, error: payErr } = await supabase
      .from("payments")
      .insert({
        appointment_id: appt.id,
        patient_id: userId,
        amount: data.amount,
        status: "pending",
      })
      .select("id")
      .single();
    if (payErr || !pay) throw new Error(payErr?.message || "Could not create payment");

    // 3. Razorpay order — amount in paise
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: Math.round(data.amount * 100),
        currency: "INR",
        receipt: pay.id,
        notes: { appointment_id: appt.id, patient_id: userId },
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Razorpay order failed:", txt);
      throw new Error("Could not create payment order");
    }
    const order = await res.json() as { id: string; amount: number; currency: string };

    await supabase
      .from("payments")
      .update({ razorpay_order_id: order.id })
      .eq("id", pay.id);

    return {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      appointmentId: appt.id,
      paymentId: pay.id,
    };
  });

/**
 * Verifies Razorpay signature, marks payment paid, allocates a token number,
 * and returns the confirmed appointment id.
 */
export const verifyBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      appointmentId: z.string().uuid(),
      paymentId: z.string().uuid(),
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Payment provider not configured");

    const { createHmac, timingSafeEqual } = await import("node:crypto");
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpay_signature);
    const ok = a.length === b.length && timingSafeEqual(a, b);

    const { supabase, userId } = context;

    if (!ok) {
      await supabase.from("payments").update({ status: "failed" }).eq("id", data.paymentId);
      throw new Error("Invalid payment signature");
    }

    // Allocate token via admin (function is restricted from authenticated)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: apptRow, error: apptFetchErr } = await supabaseAdmin
      .from("appointments")
      .select("appointment_date, patient_id")
      .eq("id", data.appointmentId)
      .single();
    if (apptFetchErr || !apptRow) throw new Error("Appointment not found");
    if (apptRow.patient_id !== userId) throw new Error("Forbidden");

    const { data: tokenData, error: tokenErr } = await supabaseAdmin
      .rpc("allocate_token", { _date: apptRow.appointment_date });
    if (tokenErr) throw new Error(tokenErr.message);
    const tokenNumber = tokenData as unknown as number;

    await supabaseAdmin
      .from("appointments")
      .update({ token_number: tokenNumber })
      .eq("id", data.appointmentId);

    await supabase
      .from("payments")
      .update({
        status: "paid",
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      })
      .eq("id", data.paymentId);

    return { tokenNumber, appointmentId: data.appointmentId };
  });
