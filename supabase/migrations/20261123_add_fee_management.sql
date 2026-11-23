-- ==============================================================================
-- HANOON ACADEMY: FEE MANAGEMENT & INSTALLMENT PAYMENT TRACKING MIGRATION
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Add fee tracking columns to the students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS total_fee NUMERIC DEFAULT 3000;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS balance_fee NUMERIC DEFAULT 3000;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS enrolled_course_id TEXT DEFAULT 'adaviyya';

-- 2. Add installment tracking columns to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS installment_note TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fee_type TEXT DEFAULT 'ADMISSION';

-- 3. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_students_whatsapp_num ON public.students(whatsapp_num);
