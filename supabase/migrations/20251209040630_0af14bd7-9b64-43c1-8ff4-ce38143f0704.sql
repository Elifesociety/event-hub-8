-- Create storage bucket for survey content
INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-content', 'survey-content', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for survey content bucket
CREATE POLICY "Anyone can view survey content"
ON storage.objects FOR SELECT
USING (bucket_id = 'survey-content');

CREATE POLICY "Admins can upload survey content"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'survey-content');

CREATE POLICY "Admins can update survey content"
ON storage.objects FOR UPDATE
USING (bucket_id = 'survey-content');

CREATE POLICY "Admins can delete survey content"
ON storage.objects FOR DELETE
USING (bucket_id = 'survey-content');