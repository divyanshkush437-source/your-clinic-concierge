
-- Link patients to auth users + email
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS patients_user_id_idx ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS patients_mobile_idx ON public.patients(mobile);

-- Claim past walk-in patient records by phone after the user signs up.
CREATE OR REPLACE FUNCTION public.claim_patient_records(_phone text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  affected integer;
BEGIN
  IF uid IS NULL OR _phone IS NULL OR length(_phone) < 5 THEN
    RETURN 0;
  END IF;
  UPDATE public.patients
     SET user_id = uid
   WHERE mobile = _phone
     AND (user_id IS NULL OR user_id = uid);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_patient_records(text) TO authenticated;

-- Patient cancels their own appointment, only before its start time.
CREATE OR REPLACE FUNCTION public.cancel_my_appointment(_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  appt record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT a.id, a.status, a.appointment_date, a.estimated_time, p.user_id AS owner
    INTO appt
    FROM public.appointments a
    JOIN public.patients p ON p.id = a.patient_id
   WHERE a.id = _appointment_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  IF appt.owner IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Not your appointment'; END IF;
  IF appt.status IN ('completed','cancelled','consulting') THEN
    RAISE EXCEPTION 'Cannot cancel an appointment that is %', appt.status;
  END IF;
  IF appt.appointment_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Appointment already passed';
  END IF;

  UPDATE public.appointments
     SET status = 'cancelled'
   WHERE id = _appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_my_appointment(uuid) TO authenticated;
