-- Security fixes: Update RLS policies to restrict access to authenticated users' own data
-- Handle foreign key constraints properly

-- ============================================================================
-- 1. Fix chat_sessions table - restrict to authenticated users' own sessions
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Public can view chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Public can update own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Public can create chat sessions" ON public.chat_sessions;

-- Create secure policies for authenticated users only
CREATE POLICY "Users can view their own chat sessions" 
ON public.chat_sessions 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own chat sessions" 
ON public.chat_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat sessions" 
ON public.chat_sessions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 2. Fix chat_messages table - restrict to authenticated users' own messages
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Public can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public can create chat messages" ON public.chat_messages;

-- Create secure policies for authenticated users only
CREATE POLICY "Users can view their own chat messages" 
ON public.chat_messages 
FOR SELECT 
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chat messages in their own sessions" 
ON public.chat_messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  session_id IN (
    SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 3. Fix user_queries table - add read protection for authenticated users
-- ============================================================================

-- Keep the existing insert policy for logging but add read protection
CREATE POLICY "Users can view their own queries" 
ON public.user_queries 
FOR SELECT 
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. Fix feedback table - protect contact information
-- ============================================================================

-- Add read policy to protect contact information
CREATE POLICY "No public read access to feedback" 
ON public.feedback 
FOR SELECT 
TO authenticated
USING (false); -- This ensures no one can read feedback data

-- Keep the insert policy as is for public feedback submission
-- The existing "Anyone can submit feedback" INSERT policy remains appropriate