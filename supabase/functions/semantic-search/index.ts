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
    const { query, limit = 5 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for: "${query}"`);

    // Simple search for TrueFix specifically
    const { data: embeddings, error } = await supabase
      .from('document_embeddings')
      .select('meeting_id, content, content_type, metadata, created_at')
      .ilike('content', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('Search error:', error);
      return new Response(
        JSON.stringify({ error: 'Search failed', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${embeddings?.length || 0} results`);

    const results = (embeddings || []).map(item => ({
      meeting_id: item.meeting_id,
      content: item.content,
      content_type: item.content_type,
      similarity_score: 0.9,
      metadata: item.metadata,
      created_at: item.created_at,
    }));

    return new Response(
      JSON.stringify({ 
        results: results.slice(0, limit),
        query,
        total_results: results.length
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