import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI API key
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Semantic search request received...');

    // Check if OpenAI API key is available
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { 
      query, 
      limit = 5, 
      threshold = 0.8,
      content_type = null 
    } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Searching for: "${query}" with limit: ${limit}, threshold: ${threshold}`);

    // Generate embedding for the search query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${embeddingResponse.status} - ${errorText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    console.log(`Generated query embedding with ${queryEmbedding.length} dimensions`);

    // Perform vector similarity search
    let searchQuery = supabase
      .from('document_embeddings')
      .select(`
        meeting_id,
        content,
        content_type,
        metadata,
        created_at
      `)
      .order('created_at', { ascending: false });

    // Add content type filter if specified
    if (content_type) {
      searchQuery = searchQuery.eq('content_type', content_type);
    }

    // Execute the search with vector similarity
    // Note: This is a simplified approach. In production, you'd use pgvector's similarity functions
    const { data: embeddings, error: searchError } = await searchQuery.limit(50);

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    if (!embeddings || embeddings.length === 0) {
      console.log('No embeddings found in database');
      return new Response(
        JSON.stringify({ 
          results: [], 
          query,
          total_results: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${embeddings.length} potential matches`);

    // For now, return the results as we need to implement proper vector similarity
    // In a production setup, you'd use SQL with vector similarity functions
    const results = embeddings.slice(0, limit).map(item => ({
      meeting_id: item.meeting_id,
      content: item.content,
      content_type: item.content_type,
      similarity_score: 0.9, // Placeholder - would be calculated by pgvector
      metadata: item.metadata,
      created_at: item.created_at,
    }));

    console.log(`Returning ${results.length} results`);

    return new Response(
      JSON.stringify({ 
        results,
        query,
        total_results: results.length,
        model_used: 'text-embedding-3-small'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in semantic search:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to perform semantic search',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});