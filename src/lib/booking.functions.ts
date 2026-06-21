import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getRazorpayPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { keyId: process.env.RAZORPAY_KEY_ID ?? "" };
});

/**
 * Guest booking: creates patient + appointment (status=booked, no token yet)
 * + pending payment + Razorpay order. No login required.
 */
export const createBookingOrder = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      full_name: z.string().trim().min(2).max(100),
      mobile: z.string().trim().regex(/^[6-9]\d{9}$/),
      age: z.number().int().min(1).max(120),
      gender: z.enum(["male", "female", "other"]),
      appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      appointmentTime: z.string().min(1).max(20),
      amount: z.number().int().positive().max(100000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Payment provider not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Patient
    const { data: patient, error: patErr } = await supabaseAdmin
      .from("patients")
      .insert({
        full_name: data.full_name,
        mobile: data.mobile,
        age: data.age,
        gender: data.gender,
      })
      .select("id")
      .single();
    if (patErr || !patient) throw new Error(patErr?.message || "Could not save patient");

    // 2. Appointment
    const { data: appt, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .insert({
        patient_id: patient.id,
        appointment_date: data.appointmentDate,
        estimated_time: data.appointmentTime,
        status: "booked",
        consultation_fee: data.amount,
      })
      .select("id")
      .single();
    if (apptErr || !appt) throw new Error(apptErr?.message || "Could not create appointment");

    // 3. Payment (pending)
    const { data: pay, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        appointment_id: appt.id,
        patient_id: patient.id,
        amount: data.amount,
        status: "pending",
      })
      .select("id")
      .single();
    if (payErr || !pay) throw new Error(payErr?.message || "Could not create payment");

    // 4. Razorpay order — amount in paise
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: Math.round(data.amount * 100),
        currency: "INR",
        receipt: pay.id,
        notes: { appointment_id: appt.id, patient_id: patient.id },
      }),
    });
    if (!res.ok) {
      console.error("Razorpay order failed:", await res.text());
      throw new Error("Could not create payment order");
    }
    const order = await res.json() as { id: string; amount: number; currency: string };

    await supabaseAdmin.from("payments").update({ razorpay_order_id: order.id }).eq("id", pay.id);

    return {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      appointmentId: appt.id,
      paymentId: pay.id,
      patientId: patient.id,
    };
  });

/**
 * Verifies Razorpay signature, marks payment paid, allocates a token number.
 */
export const verifyBookingPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      appointmentId: z.string().uuid(),
      paymentId: z.string().uuid(),
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Payment provider not configured");

    const { createHmac, timingSafeEqual } = await import("node:crypto");
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpay_signature);
    const ok = a.length === b.length && timingSafeEqual(a, b);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!ok) {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", data.paymentId);
      throw new Error("Invalid payment signature");
    }

    const { data: apptRow, error: apptFetchErr } = await supabaseAdmin
      .from("appointments")
      .select("appointment_date")
      .eq("id", data.appointmentId)
      .single();
    if (apptFetchErr || !apptRow) throw new Error("Appointment not found");

    const { data: tokenData, error: tokenErr } = await supabaseAdmin
      .rpc("allocate_token", { _date: apptRow.appointment_date });
    if (tokenErr) throw new Error(tokenErr.message);
    const tokenNumber = tokenData as unknown as number;

    await supabaseAdmin
      .from("appointments")
      .update({ token_number: tokenNumber })
      .eq("id", data.appointmentId);

    await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      })
      .eq("id", data.paymentId);

    return { tokenNumber, appointmentId: data.appointmentId };
  });
