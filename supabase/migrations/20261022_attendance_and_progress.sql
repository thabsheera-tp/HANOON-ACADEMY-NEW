-- ==============================================================================
-- HANOON ACADEMY - ATTENDANCE & COURSE PROGRESS MIGRATION
-- Run this in the Supabase SQL Editor to enable attendance and student evaluation tracking
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_phone TEXT,
    student_name TEXT,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    subject_id TEXT,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')) DEFAULT 'PRESENT',
    notes TEXT,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for attendance
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course_id ON public.attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);

-- RLS Policies
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read attendance" ON public.attendance;
CREATE POLICY "Allow read attendance" ON public.attendance
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert attendance" ON public.attendance;
CREATE POLICY "Allow insert attendance" ON public.attendance
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update attendance" ON public.attendance;
CREATE POLICY "Allow update attendance" ON public.attendance
    FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for attendance
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
