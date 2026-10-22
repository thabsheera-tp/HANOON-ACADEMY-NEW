-- ==============================================================================
-- HANOON ACADEMY - RECORDED CLASS LINKS & CONTENT MANAGEMENT MIGRATION
-- Run this in the Supabase SQL Editor to ensure all recorded class link columns,
-- foreign key safety, and realtime capabilities are active.
-- ==============================================================================

-- 1. Ensure live_classes columns exist for recorded class links and notes
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS notes_pdf_url TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS attendees_count INTEGER DEFAULT 0;

-- Ensure teacher_id on live_classes allows nulls if custom/staff scheduled
ALTER TABLE public.live_classes ALTER COLUMN teacher_id DROP NOT NULL;

-- 2. Ensure special_classes columns exist for recorded class links and notes
ALTER TABLE public.special_classes ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.special_classes ADD COLUMN IF NOT EXISTS pdf_title TEXT;
ALTER TABLE public.special_classes ADD COLUMN IF NOT EXISTS pdf_size TEXT;

-- 3. Ensure course_subjects has chapters jsonb column
ALTER TABLE public.course_subjects ADD COLUMN IF NOT EXISTS chapters JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.course_subjects ADD COLUMN IF NOT EXISTS live_url TEXT;

-- 4. Create indexes for quick retrieval of recorded classes by course, subject, and date
CREATE INDEX IF NOT EXISTS idx_live_classes_course_subject ON public.live_classes(course_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_recording_url ON public.live_classes(recording_url) WHERE recording_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled_at ON public.live_classes(scheduled_at DESC);

-- 5. RLS Policies for live_classes
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select live_classes for all" ON public.live_classes;
CREATE POLICY "Allow select live_classes for all" ON public.live_classes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert live_classes for auth" ON public.live_classes;
CREATE POLICY "Allow insert live_classes for auth" ON public.live_classes
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update live_classes for auth" ON public.live_classes;
CREATE POLICY "Allow update live_classes for auth" ON public.live_classes
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete live_classes for auth" ON public.live_classes;
CREATE POLICY "Allow delete live_classes for auth" ON public.live_classes
    FOR DELETE USING (true);

-- 6. Enable Realtime on live_classes
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
