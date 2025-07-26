-- Fix security issue: Set search_path for match_documents function
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  meeting_id text,
  content text,
  content_type text,
  metadata jsonb,
  created_at timestamp with time zone,
  similarity float
)
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    meeting_id,
    content,
    content_type,
    metadata,
    created_at,
    1 - (embedding <=> query_embedding) as similarity
  FROM document_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;