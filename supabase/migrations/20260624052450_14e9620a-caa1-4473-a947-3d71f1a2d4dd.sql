
-- ============ Drop unused single-clinic tables ============
DROP TABLE IF EXISTS public.waiting_list CASCADE;
DROP TABLE IF EXISTS public.clinic_settings CASCADE;

-- ============ doctors ============
CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name text NOT NULL,
  specialization text NOT NULL DEFAULT '',
  qualification text NOT NULL DEFAULT '',
  experience_years integer NOT NULL DEFAULT 0 CHECK (experience_years >= 0 AND experience_years <= 80),
  clinic_name text NOT NULL DEFAULT '',
  clinic_address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  consultation_fee integer NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0 AND consultation_fee <= 100000),
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  profile_photo_url text NOT NULL DEFAULT '',
  available_days text[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri','sat'],
  time_start text NOT NULL DEFAULT '10:00',
  time_end text NOT NULL DEFAULT '14:00',
  slot_minutes integer NOT NULL DEFAULT 15 CHECK (slot_minutes BETWEEN 5 AND 120),
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doctors TO anon;
GRANT SELECT, INSERT, UPDATE ON public.doctors TO authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved doctors public read" ON public.doctors FOR SELECT
  USING (verification_status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "doctor self insert" ON public.doctors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "doctor self update" ON public.doctors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER doctors_updated_at BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX doctors_city_idx ON public.doctors(city);
CREATE INDEX doctors_spec_idx ON public.doctors(specialization);
CREATE INDEX doctors_status_idx ON public.doctors(verification_status);

-- ============ appointments: add doctor_id ============
ALTER TABLE public.appointments
  ADD COLUMN doctor_id uuid REFERENCES public.doctors(id) ON DELETE CASCADE;
CREATE INDEX appointments_doctor_date_idx ON public.appointments(doctor_id, appointment_date);
CREATE UNIQUE INDEX appointments_doctor_date_token_uq
  ON public.appointments(doctor_id, appointment_date, token_number)
  WHERE token_number IS NOT NULL;

DROP POLICY IF EXISTS "appts staff update" ON public.appointments;
CREATE POLICY "appts owner update" ON public.appointments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

-- ============ payments: add doctor_id ============
ALTER TABLE public.payments
  ADD COLUMN doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL;
CREATE INDEX payments_doctor_idx ON public.payments(doctor_id);

DROP POLICY IF EXISTS "payments staff update" ON public.payments;
CREATE POLICY "payments owner update" ON public.payments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

-- ============ doctor_reviews ============
CREATE TABLE public.doctor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doctor_reviews TO anon, authenticated;
GRANT ALL ON public.doctor_reviews TO service_role;
ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.doctor_reviews FOR SELECT USING (true);
CREATE INDEX doctor_reviews_doctor_idx ON public.doctor_reviews(doctor_id);

-- ============ Per-doctor allocate_token ============
DROP FUNCTION IF EXISTS public.allocate_token(date);
CREATE OR REPLACE FUNCTION public.allocate_token(_doctor_id uuid, _date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE next_token INT;
BEGIN
  SELECT COALESCE(MAX(token_number),0)+1 INTO next_token
    FROM public.appointments
    WHERE doctor_id = _doctor_id
      AND appointment_date = _date
      AND token_number IS NOT NULL;
  RETURN next_token;
END $$;
REVOKE EXECUTE ON FUNCTION public.allocate_token(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_token(uuid, date) TO service_role;

-- ============ Bootstrap admin ============
CREATE OR REPLACE FUNCTION public.bootstrap_admin_if_none()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN public.has_role(_uid, 'admin');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin_if_none() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_if_none() TO authenticated;

-- ============ handle_new_user: no auto 'patient' role anymore ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, mobile)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
          NEW.raw_user_meta_data->>'mobile')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

-- ============ Realtime ============
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
