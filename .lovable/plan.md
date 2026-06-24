# Multi-doctor SmartClinic platform

Turn the current single-clinic app into a marketplace: doctors register and manage their own clinic; super-admin approves them; patients browse and book without an account.

## Database

New / changed tables (migration):

- `doctors` — links to `auth.users(id)` (one row per doctor account).
  Fields: `id`, `user_id`, `doctor_name`, `specialization`, `qualification`, `experience_years`, `clinic_name`, `clinic_address`, `city`, `state`, `consultation_fee`, `phone`, `email`, `profile_photo_url`, `available_days` (text[]), `time_start`, `time_end`, `slot_minutes`, `verification_status` ('pending'|'approved'|'rejected'), timestamps.
- `appointments` — add `doctor_id uuid` (FK doctors), keep `patient_id` (FK patients), `appointment_date`, `appointment_time`, `token_number`, `status`, `consultation_fee`. Token uniqueness scoped to `(doctor_id, appointment_date)`.
- `payments` — add `doctor_id` for earnings queries.
- `app_role` enum: add `'admin'` (super admin), keep `'doctor'`, drop unused `'patient'`/`'staff'` usage in code.
- `patients` — unchanged (guest details).
- `doctor_reviews` — `id, doctor_id, patient_id, rating (1-5), comment, created_at`. Schema only for now (future-ready).
- Drop the old single-clinic `clinic_settings` table — replaced by per-doctor fields.

Functions / policies:

- `allocate_token(_doctor_id uuid, _date date)` returns next int per doctor per day (service-role only).
- RLS:
  - `doctors`: anyone can SELECT approved rows; doctor can SELECT/UPDATE own row (any status); admin can SELECT/UPDATE all.
  - `appointments`: public SELECT (confirmation/queue), writes via service-role server fn, doctors can UPDATE own appointments, admins can UPDATE all.
  - `payments`: doctor can SELECT own payments (earnings), admin can SELECT all, writes via service-role.
  - `doctor_reviews`: public SELECT, writes via service-role.
  - `patients`: unchanged — public SELECT, writes via service-role.

## Server functions

`src/lib/booking.functions.ts`:

- `createBookingOrder` now takes `doctorId` and creates appointment under that doctor; pulls consultation fee from the doctor row (ignores client-sent amount).
- `verifyBookingPayment` calls `allocate_token(doctor_id, date)`.

New `src/lib/doctor.functions.ts`:

- `submitDoctorRegistration` (auth required) — upserts the signed-in user's doctor row with `verification_status='pending'`.
- `updateDoctorProfile` (auth required) — doctor edits own profile (re-enters pending review only if admin requires it; default just updates editable fields).
- `setDoctorApproval` (auth required, admin only) — sets `approved` / `rejected`.

## Routes

Public:

- `/` — landing: search bar + featured specializations + CTA. Replaces single-doctor hero.
- `/doctors` — list with search (name), filter by specialization + city. Reads only `verification_status='approved'`.
- `/doctors/$id` — public doctor profile (name, specialization, qualification, experience, clinic, address, fee, available days/timings, placeholder for ratings, "Book appointment" CTA).
- `/book/$doctorId` — guest booking form (name, mobile, age, gender, date, time). Replaces existing `/book`.
- `/confirmation/$id` — shows doctor name too.
- `/queue/$doctorId` — live queue per doctor (replaces single `/queue`).
- `/auth` — login + doctor signup tabs. Patients never come here.

Authenticated (under `_authenticated/`):

- `/doctor/onboarding` — doctor completes profile right after signup; submits for verification.
- `/doctor/dashboard` — for verified doctors: today's appointments + call-next/skip/complete actions, earnings card (sum of paid payments this month / lifetime), counters.
- `/doctor/profile` — edit profile + clinic timings + fee.
- `/doctor/pending` — shown when `verification_status='pending'` or `'rejected'`.
- `/admin` — super-admin only: tabs for "Pending doctors" (approve/reject), "All doctors", "Platform stats" (total appointments, total doctors, total patients).

Routing logic in `_authenticated/route.tsx` stays integration-managed (auth gate). Role-based redirects (doctor vs admin) live in each route's `beforeLoad`.

Files to remove: `_authenticated/admin.tsx` (replaced), `_authenticated/doctor.tsx` (replaced), `_authenticated/settings.tsx` (per-doctor profile replaces it), `lib/clinic.ts` (single-doctor constants — keep only generic platform constants).

## UI

- Header: brand "SmartClinic", links: Find Doctors, For Doctors (→ /auth signup), and (when logged in) Dashboard.
- Landing: search input → `/doctors?q=...`, specialization chips, "Are you a doctor?" CTA.
- Doctors list: card grid with photo placeholder, name, specialization, city, fee, "Book" button.
- Doctor profile: hero with photo + details + "Book ₹fee" CTA.
- Doctor dashboard: stat cards (today / waiting / earnings) + appointments table.
- Admin: pending-doctors list with Approve/Reject buttons, all-doctors table, totals.

## i18n

Add keys for: findDoctors, searchPlaceholder, specialization, city, experience, qualification, pendingApproval, approved, rejected, earnings, etc. (EN + HI).

## Out of scope (kept simple / future)

- Profile photo: text URL field for now; no upload UI.
- Doctor reviews: table created, no submission UI yet.
- `available_time_slots` modeled as `time_start`/`time_end` + `slot_minutes`; slots are generated client-side from these. (Avoids a separate `doctor_availability` table; can add later if needed.)
- Doctor earnings: simple sum of own paid payments — no payout/withdrawal flow.
- Super admin self-signup: not exposed. Admin role is granted manually via SQL (one bootstrap statement included). I'll show you the email field to use.

## Workflow summary

1. Doctor signs up → lands on `/doctor/onboarding` → submits profile (pending).
2. Super-admin reviews at `/admin` → approves/rejects.
3. Approved doctor accesses `/doctor/dashboard`.
4. Patient browses `/doctors`, opens `/doctors/$id`, books via `/book/$id`, pays, gets token (per-doctor sequence), sees `/confirmation/$id`.
5. Doctor manages queue from dashboard (call next, complete, skip).

## Confirm before I build

- Bootstrap the **first super-admin** — what email should I grant the `admin` role to after you sign up at `/auth`? (Or do you want me to scaffold a one-time "claim admin" page protected by a secret?)
- OK to delete the old single-clinic admin/doctor/settings pages and the `clinic_settings` table?
- Profile photo as a URL field for now (no upload)?
