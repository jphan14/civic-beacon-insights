import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10, threshold = 0.7 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for: "${query}"`);
    console.log(`Query length: ${query.length}, type: ${typeof query}`);

    // First, try to generate an embedding for the query using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      console.warn('OpenAI API key not found, falling back to text search');
      // Fallback to text-based search
      const { data: textResults, error: textError } = await supabase
        .from('document_embeddings')
        .select('meeting_id, content, content_type, metadata, created_at')
        .textSearch('content', query)
        .limit(limit);
      
      if (textError) {
        console.error('Text search error:', textError);
        return new Response(
          JSON.stringify({ error: 'Search failed', details: textError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = (textResults || []).map(item => ({
        meeting_id: item.meeting_id,
        content: item.content,
        content_type: item.content_type,
        similarity_score: 0.8,
        metadata: item.metadata,
        created_at: item.created_at,
      }));

      return new Response(
        JSON.stringify({ 
          results: results.slice(0, limit),
          query,
          total_results: results.length,
          search_type: 'text'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding for the query
    console.log('Generating embedding for query...');
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      console.error('OpenAI embedding failed, falling back to text search');
      // Fallback to text search
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from('document_embeddings')
        .select('meeting_id, content, content_type, metadata, created_at')
        .ilike('content', `%${query}%`)
        .limit(limit);
      
      if (fallbackError) {
        console.error('Fallback search error:', fallbackError);
        return new Response(
          JSON.stringify({ error: 'Search failed', details: fallbackError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = (fallbackResults || []).map(item => ({
        meeting_id: item.meeting_id,
        content: item.content,
        content_type: item.content_type,
        similarity_score: 0.7,
        metadata: item.metadata,
        created_at: item.created_at,
      }));

      return new Response(
        JSON.stringify({ 
          results: results.slice(0, limit),
          query,
          total_results: results.length,
          search_type: 'text_fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    
    console.log('Generated embedding, performing similarity search...');

    // Perform similarity search using the embedding
    const { data: embeddings, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit * 2 // Get more results to ensure diversity
    });

    if (error) {
      console.error('Vector search error:', error);
      // Fallback to text search if vector search fails
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from('document_embeddings')
        .select('meeting_id, content, content_type, metadata, created_at')
        .ilike('content', `%${query}%`)
        .limit(limit);
      
      if (fallbackError) {
        console.error('Final fallback search error:', fallbackError);
        return new Response(
          JSON.stringify({ error: 'All search methods failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = (fallbackResults || []).map(item => ({
        meeting_id: item.meeting_id,
        content: item.content,
        content_type: item.content_type,
        similarity_score: 0.7,
        metadata: item.metadata,
        created_at: item.created_at,
      }));

      return new Response(
        JSON.stringify({ 
          results: results.slice(0, limit),
          query,
          total_results: results.length,
          search_type: 'text_fallback_after_vector_error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Vector search found ${embeddings?.length || 0} results`);

    const results = (embeddings || []).map(item => ({
      meeting_id: item.meeting_id,
      content: item.content,
      content_type: item.content_type,
      similarity_score: item.similarity,
      metadata: item.metadata,
      created_at: item.created_at,
    }));

    // Return diverse results - prioritize different meetings
    const diverseResults = [];
    const seenMeetings = new Set();
    
    // First pass: add unique meetings with highest similarity
    for (const result of results) {
      if (!seenMeetings.has(result.meeting_id) && diverseResults.length < limit) {
        diverseResults.push(result);
        seenMeetings.add(result.meeting_id);
      }
    }
    
    // Second pass: fill remaining slots if needed
    for (const result of results) {
      if (diverseResults.length < limit) {
        const existingFromSameMeeting = diverseResults.filter(r => r.meeting_id === result.meeting_id).length;
        if (existingFromSameMeeting < 2) { // Allow up to 2 results per meeting
          diverseResults.push(result);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        results: diverseResults,
        query,
        total_results: diverseResults.length,
        search_type: 'vector'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Function failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});