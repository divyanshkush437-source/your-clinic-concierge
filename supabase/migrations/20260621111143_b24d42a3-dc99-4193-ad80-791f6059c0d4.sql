
-- Remove anon write policies; server function uses service-role for writes.
DROP POLICY IF EXISTS "patients public insert"   ON public.patients;
DROP POLICY IF EXISTS "appts public insert"      ON public.appointments;
DROP POLICY IF EXISTS "payments public insert"   ON public.payments;

REVOKE INSERT ON public.patients     FROM anon, authenticated;
REVOKE INSERT ON public.appointments FROM anon;
REVOKE INSERT ON public.payments     FROM anon;

-- Lock the internal token allocator to service role only.
REVOKE EXECUTE ON FUNCTION public.allocate_token(date) FROM PUBLIC, anon, authenticated;
