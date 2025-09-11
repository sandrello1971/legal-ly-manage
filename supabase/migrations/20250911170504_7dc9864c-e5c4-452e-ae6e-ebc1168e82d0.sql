-- Make documents bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'documents';