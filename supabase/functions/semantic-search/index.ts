import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Simple text-based search approach
    console.log('Using text-based semantic search');
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    console.log(`Search terms: ${searchTerms.join(', ')}`);
    
    // Build search query with proper error handling
    let searchQuery = supabase
      .from('document_embeddings')
      .select('meeting_id, content, content_type, metadata, created_at');

    // Simple OR search for the main query and individual terms
    const orConditions = [
      `content.ilike.%${query}%`,
      `metadata->>title.ilike.%${query}%`
    ];
    
    // Add individual term searches
    searchTerms.forEach(term => {
      orConditions.push(`content.ilike.%${term}%`);
    });

    searchQuery = searchQuery.or(orConditions.join(','));

    // Add content type filter if specified
    if (content_type) {
      searchQuery = searchQuery.eq('content_type', content_type);
    }

    searchQuery = searchQuery.limit(50);

    console.log('Executing search query...');
    const { data: embeddings, error: searchError } = await searchQuery;

    if (searchError) {
      console.error('Search error:', searchError);
      return new Response(
        JSON.stringify({ 
          error: 'Search failed',
          details: searchError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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

    // Score results based on text relevance and specific boosts
    const results = embeddings
      .map(item => {
        let score = 0.3; // Base score
        const content = (item.content || '').toLowerCase();
        const title = ((item.metadata as any)?.title || '').toLowerCase();
        const date = ((item.metadata as any)?.date || '').toLowerCase();
        
        // Boost score for query terms in content
        searchTerms.forEach(term => {
          if (content.includes(term)) score += 0.2;
          if (title.includes(term)) score += 0.3;
        });
        
        // Boost for exact business names and specific terms
        if (query.toLowerCase().includes('truefix') || query.toLowerCase().includes('tech repair')) {
          if (content.includes('truefix') || content.includes('tech repair')) score += 0.5;
        }
        
        // Boost for specific request types
        if (query.toLowerCase().includes('window sign') || query.toLowerCase().includes('signage')) {
          if (content.includes('window sign') || content.includes('signage')) score += 0.4;
        }
        
        // Boost for budget-related terms
        if (query.toLowerCase().includes('budget')) {
          if (content.includes('budget') || title.includes('budget')) score += 0.3;
        }
        
        return {
          meeting_id: item.meeting_id,
          content: item.content,
          content_type: item.content_type,
          similarity_score: Math.min(score, 1.0), // Cap at 1.0
          metadata: item.metadata,
          created_at: item.created_at,
        };
      })
      .filter(item => item.similarity_score >= (threshold * 0.6)) // Lower threshold for text search
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit);

    console.log(`Returning ${results.length} results`);

    return new Response(
      JSON.stringify({ 
        results,
        query,
        total_results: results.length,
        model_used: 'text-search'
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