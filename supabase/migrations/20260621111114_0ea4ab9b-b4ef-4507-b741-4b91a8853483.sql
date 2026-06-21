
-- Guest patient table for walk-in / no-account bookings
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  mobile text NOT NULL,
  age integer NOT NULL CHECK (age > 0 AND age < 130),
  gender text NOT NULL CHECK (gender IN ('male','female','other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.patients TO anon, authenticated;
GRANT ALL ON public.patients TO service_role;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Anyone may create a patient (guest booking) and read by id (confirmation page).
CREATE POLICY "patients public insert" ON public.patients FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "patients public read"   ON public.patients FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "patients staff update"  ON public.patients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- Open appointments + payments to guest bookings.
-- Existing tables already have patient_id uuid (no FK) — keep as is, repoint policies.

-- APPOINTMENTS: drop old auth-bound policies and write guest-friendly ones.
DROP POLICY IF EXISTS "appts patient insert own"  ON public.appointments;
DROP POLICY IF EXISTS "appts patient read own"    ON public.appointments;
DROP POLICY IF EXISTS "appts patient cancel own"  ON public.appointments;

CREATE POLICY "appts public insert" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "appts public read"   ON public.appointments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "appts staff update"  ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'doctor'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'doctor'));

GRANT SELECT, INSERT ON public.appointments TO anon;

-- PAYMENTS: drop old policies and write guest-friendly ones.
DROP POLICY IF EXISTS "payments insert own"          ON public.payments;
DROP POLICY IF EXISTS "payments read"                ON public.payments;
DROP POLICY IF EXISTS "payments update own or staff" ON public.payments;

CREATE POLICY "payments public insert" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "payments public read"   ON public.payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "payments staff update"  ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'staff'));

GRANT SELECT, INSERT ON public.payments TO anon;
