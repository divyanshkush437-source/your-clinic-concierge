
CREATE TABLE public.clinic_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  consultation_fee INTEGER NOT NULL DEFAULT 300,
  clinic_timing TEXT NOT NULL DEFAULT 'Mon – Sat • 10:00 AM – 2:00 PM, 5:00 PM – 8:00 PM',
  max_patients_per_day INTEGER NOT NULL DEFAULT 30,
  doctor_name TEXT NOT NULL DEFAULT 'Dr. Anjali Verma',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinic_settings_singleton CHECK (id = true)
);

GRANT SELECT ON public.clinic_settings TO anon, authenticated;
GRANT UPDATE, INSERT ON public.clinic_settings TO authenticated;
GRANT ALL ON public.clinic_settings TO service_role;

ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clinic settings"
  ON public.clinic_settings FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert clinic settings"
  ON public.clinic_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update clinic settings"
  ON public.clinic_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER clinic_settings_updated_at
  BEFORE UPDATE ON public.clinic_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.clinic_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
