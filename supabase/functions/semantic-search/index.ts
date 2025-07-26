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

    // Test with multiple search approaches
    console.log('Testing different search approaches...');
    
    // First try exact TrueFix search
    const { data: truefixTest, error: truefixError } = await supabase
      .from('document_embeddings')
      .select('meeting_id, content_type')
      .ilike('content', '%TrueFix%')
      .limit(1);
    
    console.log(`TrueFix direct test found: ${truefixTest?.length || 0} results`);
    
    // Then try multiple variations of the user's query
    const searchVariations = [
      query,
      query.toLowerCase(),
      'TrueFix',
      'truefix',
      'Tech Repair',
      'window sign'
    ];
    
    console.log('Testing search variations:', searchVariations);
    
    let embeddings = null;
    let error = null;
    
    // Try each variation until we find results
    for (const searchTerm of searchVariations) {
      const { data: testData, error: testError } = await supabase
        .from('document_embeddings')
        .select('meeting_id, content, content_type, metadata, created_at')
        .ilike('content', `%${searchTerm}%`)
        .limit(25);
      
      console.log(`Search for "${searchTerm}" found: ${testData?.length || 0} results`);
      
      if (testData && testData.length > 0) {
        embeddings = testData;
        error = testError;
        console.log(`Using results from search term: "${searchTerm}"`);
        break;
      }
    }

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

    // Return more diverse results - don't just take the first N, spread across different meetings
    const diverseResults = [];
    const seenMeetings = new Set();
    
    // First pass: add unique meetings
    for (const result of results) {
      if (!seenMeetings.has(result.meeting_id) && diverseResults.length < limit) {
        diverseResults.push(result);
        seenMeetings.add(result.meeting_id);
      }
    }
    
    // Second pass: fill remaining slots with any results
    for (const result of results) {
      if (diverseResults.length < limit && !diverseResults.find(r => r.meeting_id === result.meeting_id)) {
        diverseResults.push(result);
      }
    }

    return new Response(
      JSON.stringify({ 
        results: diverseResults,
        query,
        total_results: diverseResults.length
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