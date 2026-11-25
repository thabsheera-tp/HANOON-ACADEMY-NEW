-- ==============================================================================
-- HANOON ACADEMY: STUDY MATERIALS TABLE & STORAGE BUCKET 'notes'
-- Table: public.study_materials
-- Storage Bucket: 'notes'
-- ==============================================================================

-- 1. CREATE 'notes' STORAGE BUCKET (AND SET IT TO PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'notes',
    'notes',
    true,
    62914560, -- 60MB limit (60 * 1024 * 1024 bytes)
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 62914560,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- 2. CREATE `public.study_materials` TABLE
CREATE TABLE IF NOT EXISTS public.study_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    course TEXT NOT NULL,
    subject TEXT,
    file_url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'pdf', -- 'pdf' or 'link'
    uploaded_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on public.study_materials
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- Policies for public.study_materials
DROP POLICY IF EXISTS "Allow All Select Study Materials" ON public.study_materials;
CREATE POLICY "Allow All Select Study Materials"
ON public.study_materials FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Allow Authenticated Insert Study Materials" ON public.study_materials;
CREATE POLICY "Allow Authenticated Insert Study Materials"
ON public.study_materials FOR INSERT
TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Authenticated Update Study Materials" ON public.study_materials;
CREATE POLICY "Allow Authenticated Update Study Materials"
ON public.study_materials FOR UPDATE
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Allow Authenticated Delete Study Materials" ON public.study_materials;
CREATE POLICY "Allow Authenticated Delete Study Materials"
ON public.study_materials FOR DELETE
TO authenticated, anon
USING (true);

-- 3. STORAGE RLS POLICIES FOR 'notes' BUCKET (Note: DO NOT run ALTER TABLE storage.objects!)
DROP POLICY IF EXISTS "Allow Public & Authenticated Read Notes Bucket" ON storage.objects;
CREATE POLICY "Allow Public & Authenticated Read Notes Bucket"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'notes');

DROP POLICY IF EXISTS "Allow Upload To Notes Bucket" ON storage.objects;
CREATE POLICY "Allow Upload To Notes Bucket"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'notes');

DROP POLICY IF EXISTS "Allow Update Notes Bucket" ON storage.objects;
CREATE POLICY "Allow Update Notes Bucket"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'notes');

DROP POLICY IF EXISTS "Allow Delete Notes Bucket" ON storage.objects;
CREATE POLICY "Allow Delete Notes Bucket"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'notes');
