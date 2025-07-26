-- Add an index to speed up meeting_id lookups and date-based searches
CREATE INDEX IF NOT EXISTS idx_document_embeddings_meeting_id ON document_embeddings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_date ON document_embeddings((metadata->>'date'));

-- Check what we have in the database so far
SELECT 
  COUNT(*) as total_embeddings,
  MIN((metadata->>'date')::date) as earliest_date,
  MAX((metadata->>'date')::date) as latest_date,
  COUNT(DISTINCT (metadata->>'date')) as unique_dates
FROM document_embeddings 
WHERE metadata->>'date' IS NOT NULL;