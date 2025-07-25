-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for storing document embeddings
CREATE TABLE public.document_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'summary',
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for chat sessions
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user queries tracking
CREATE TABLE public.user_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  session_id UUID REFERENCES public.chat_sessions(id),
  response_time_ms INTEGER,
  relevant_meetings TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_queries ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is civic data)
CREATE POLICY "Public can view document embeddings" 
ON public.document_embeddings FOR SELECT USING (true);

CREATE POLICY "Public can view chat sessions" 
ON public.chat_sessions FOR SELECT USING (true);

CREATE POLICY "Public can create chat sessions" 
ON public.chat_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update own sessions" 
ON public.chat_sessions FOR UPDATE USING (true);

CREATE POLICY "Public can view chat messages" 
ON public.chat_messages FOR SELECT USING (true);

CREATE POLICY "Public can create chat messages" 
ON public.chat_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can create user queries" 
ON public.user_queries FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_document_embeddings_meeting_id ON public.document_embeddings(meeting_id);
CREATE INDEX idx_document_embeddings_content_type ON public.document_embeddings(content_type);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_user_queries_created_at ON public.user_queries(created_at);

-- Create vector similarity search index (cosine distance)
CREATE INDEX idx_document_embeddings_vector ON public.document_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_document_embeddings_updated_at
  BEFORE UPDATE ON public.document_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();