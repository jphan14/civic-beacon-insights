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

    // Check if query contains temporal terms that suggest recent documents
    const currentYear = new Date().getFullYear();
    const temporalTerms = ['this year', 'latest', 'recent', 'current', 'new', currentYear.toString()];
    const isTemporalQuery = temporalTerms.some(term => query.toLowerCase().includes(term));
    
    console.log(`Query is temporal: ${isTemporalQuery}, Current year: ${currentYear}`);

    // First, try simple text search as it's more reliable
    console.log('Starting with text-based search...');
    
    let textQuery = supabase
      .from('document_embeddings')
      .select('meeting_id, content, content_type, metadata, created_at')
      .or(`content.ilike.%${query}%,metadata->>title.ilike.%${query}%`);
    
    // If it's a temporal query, prioritize recent documents (2024-2025)
    if (isTemporalQuery) {
      console.log('Filtering for recent documents (2024-2025)');
      textQuery = textQuery
        .gte('metadata->>date', '2024-01-01')
        .order('metadata->>date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
    } else {
      textQuery = textQuery.order('created_at', { ascending: false });
    }
    
    const { data: textResults, error: textError } = await textQuery.limit(Math.min(limit * 2, 20));
    
    if (textError) {
      console.error('Text search error:', textError);
      return new Response(
        JSON.stringify({ error: 'Search failed', details: textError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Text search found ${textResults?.length || 0} results`);

    // If we have good text results, use them
    if (textResults && textResults.length > 0) {
      const results = textResults.map(item => ({
        meeting_id: item.meeting_id,
        content: item.content,
        content_type: item.content_type,
        similarity_score: 0.8, // Fixed score for text search
        metadata: item.metadata,
        created_at: item.created_at,
      }));

      // Return diverse results - prioritize different meetings
      const diverseResults = [];
      const seenMeetings = new Set();
      
      // First pass: add unique meetings
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
          search_type: 'text'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If text search fails or returns no results, try broader keywords
    console.log('Text search found no results, trying broader search...');
    
    const broadKeywords = ['budget', 'financial', 'fiscal', 'appropriation', 'warrant', 'spending', 'revenue', 'costs'];
    const matchingKeyword = broadKeywords.find(keyword => 
      query.toLowerCase().includes(keyword) || keyword.includes(query.toLowerCase())
    );
    
    if (matchingKeyword) {
      console.log(`Trying broader search with keyword: ${matchingKeyword}`);
      
      const { data: broadResults, error: broadError } = await supabase
        .from('document_embeddings')
        .select('meeting_id, content, content_type, metadata, created_at')
        .ilike('content', `%${matchingKeyword}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (!broadError && broadResults && broadResults.length > 0) {
        const results = broadResults.map(item => ({
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
            search_type: 'keyword_fallback'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If still no results, return recent meetings
    console.log('No specific matches found, returning recent meetings...');
    
    const { data: recentResults, error: recentError } = await supabase
      .from('document_embeddings')
      .select('meeting_id, content, content_type, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 5));
    
    if (recentError) {
      console.error('Recent search error:', recentError);
      return new Response(
        JSON.stringify({ error: 'All search methods failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = (recentResults || []).map(item => ({
      meeting_id: item.meeting_id,
      content: item.content,
      content_type: item.content_type,
      similarity_score: 0.5,
      metadata: item.metadata,
      created_at: item.created_at,
    }));

    return new Response(
      JSON.stringify({ 
        results: results,
        query,
        total_results: results.length,
        search_type: 'recent_fallback'
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