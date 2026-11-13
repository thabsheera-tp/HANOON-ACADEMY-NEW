-- ==============================================================================
-- HANOON ACADEMY: SUPABASE STORAGE BUCKET & RLS POLICIES FOR PDF NOTES
-- Exact Storage Bucket Name: 'course-materials'
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your Hanoon Academy project.
-- 3. Click "SQL Editor" in the left sidebar -> Click "New query".
-- 4. Paste the entire SQL script below and click "Run".
-- ==============================================================================

-- 1. CREATE 'course-materials' STORAGE BUCKET (AND SET IT TO PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-materials',
    'course-materials',
    true,
    52428800, -- 50MB file size limit (50 * 1024 * 1024 bytes)
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Optional fallback bucket 'pdf-notes'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'pdf-notes',
    'pdf-notes',
    true,
    52428800,
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800;

-- 2. ENABLE ROW-LEVEL SECURITY (RLS) ON storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. STORAGE RLS POLICY: SELECT (Download / Read PDF Notes)
-- Allows authenticated users (Admins, Teachers, Verifiers, Students) and public to view/download notes
DROP POLICY IF EXISTS "Allow Authenticated Select Course Materials" ON storage.objects;
DROP POLICY IF EXISTS "Public & Authenticated Read Course Materials" ON storage.objects;
DROP POLICY IF EXISTS "Public Download Course Materials" ON storage.objects;

CREATE POLICY "Allow Authenticated Select Course Materials"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id IN ('course-materials', 'pdf-notes'));

-- 4. STORAGE RLS POLICY: INSERT (Upload PDF Notes)
-- Explicitly allows authenticated users (Admins, Teachers, Verifiers) to upload new PDFs
DROP POLICY IF EXISTS "Allow Authenticated Insert Course Materials" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Course Materials" ON storage.objects;

CREATE POLICY "Allow Authenticated Insert Course Materials"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id IN ('course-materials', 'pdf-notes'));

-- 5. STORAGE RLS POLICY: UPDATE (Modify / Replace PDF Notes)
-- Allows authenticated staff to update existing PDFs
DROP POLICY IF EXISTS "Allow Authenticated Update Course Materials" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Course Materials" ON storage.objects;

CREATE POLICY "Allow Authenticated Update Course Materials"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id IN ('course-materials', 'pdf-notes'));

-- 6. STORAGE RLS POLICY: DELETE (Remove Outdated PDF Notes)
-- Allows authenticated staff to delete PDFs from storage
DROP POLICY IF EXISTS "Allow Authenticated Delete Course Materials" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete Course Materials" ON storage.objects;

CREATE POLICY "Allow Authenticated Delete Course Materials"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id IN ('course-materials', 'pdf-notes'));

-- 7. ENSURE DATABASE TABLE `live_classes` SUPPORTS DIRECT PDF NOTES
ALTER TABLE public.live_classes ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS notes_pdf_url TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS recorded_video_link TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS subject_id TEXT;
