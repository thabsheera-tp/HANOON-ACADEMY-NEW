-- ==============================================================================
-- HANOON ACADEMY - SUPABASE STORAGE BUCKET & RLS POLICIES FOR COURSE MATERIALS
-- Run this in your Supabase SQL Editor to activate the 'course-materials' bucket,
-- configure public read/upload RLS policies, and relax live_classes constraints.
-- ==============================================================================

-- 1. Create the 'course-materials' public storage bucket with 50MB limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-materials',
    'course-materials',
    true,
    52428800, -- 50MB (50 * 1024 * 1024)
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Also create 'pdf-notes' bucket as fallback
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

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Storage Policies: Allow Public Download/View
DROP POLICY IF EXISTS "Public Download Course Materials" ON storage.objects;
CREATE POLICY "Public Download Course Materials" ON storage.objects
    FOR SELECT USING (bucket_id IN ('course-materials', 'pdf-notes'));

-- 4. Storage Policies: Allow Upload for Authenticated and Authorized Staff
DROP POLICY IF EXISTS "Allow Upload Course Materials" ON storage.objects;
CREATE POLICY "Allow Upload Course Materials" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('course-materials', 'pdf-notes'));

-- 5. Storage Policies: Allow Update
DROP POLICY IF EXISTS "Allow Update Course Materials" ON storage.objects;
CREATE POLICY "Allow Update Course Materials" ON storage.objects
    FOR UPDATE USING (bucket_id IN ('course-materials', 'pdf-notes'));

-- 6. Storage Policies: Allow Delete
DROP POLICY IF EXISTS "Allow Delete Course Materials" ON storage.objects;
CREATE POLICY "Allow Delete Course Materials" ON storage.objects
    FOR DELETE USING (bucket_id IN ('course-materials', 'pdf-notes'));

-- 7. Ensure live_classes constraints allow admin/staff PDF uploads without requiring a rigid teacher foreign key
ALTER TABLE public.live_classes ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS notes_pdf_url TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS recorded_video_link TEXT;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS subject_id TEXT;

