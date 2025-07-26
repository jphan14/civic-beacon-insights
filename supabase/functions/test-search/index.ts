import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Testing search function...');
    
    // Test 1: Count total embeddings
    const { count: totalCount } = await supabase
      .from('document_embeddings')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total embeddings: ${totalCount}`);
    
    // Test 2: Direct search for TrueFix
    const { data: truefixResults, error: truefixError } = await supabase
      .from('document_embeddings')
      .select('meeting_id, metadata->\'title\' as title, metadata->\'date\' as date')
      .ilike('content', '%TrueFix%');
    
    console.log(`🏢 TrueFix direct search results: ${truefixResults?.length || 0}`);
    if (truefixResults && truefixResults.length > 0) {
      console.log('TrueFix meetings found:', truefixResults);
    }
    
    // Test 3: Test the OR query syntax
    const testQuery = "TrueFix Tech Repair window sign";
    const searchTerms = testQuery.toLowerCase().split(' ').filter(term => term.length > 2);
    
    const orConditions = [];
    orConditions.push(`content.ilike.%${testQuery}%`);
    orConditions.push(`metadata->>title.ilike.%${testQuery}%`);
    searchTerms.forEach(term => {
      orConditions.push(`content.ilike.%${term}%`);
    });
    
    console.log(`🔎 Testing OR conditions: ${orConditions.join(',')}`);
    
    const { data: orResults, error: orError } = await supabase
      .from('document_embeddings')
      .select('meeting_id, content_type, metadata, created_at')
      .or(orConditions.join(','))
      .limit(10);
    
    console.log(`📋 OR query results: ${orResults?.length || 0}`);
    if (orError) {
      console.error('OR query error:', orError);
    }
    
    // Test 4: Simple single term search
    const { data: simpleResults, error: simpleError } = await supabase
      .from('document_embeddings')
      .select('meeting_id, metadata->\'title\' as title')
      .ilike('content', '%TrueFix%')
      .limit(5);
    
    console.log(`🔍 Simple TrueFix search: ${simpleResults?.length || 0}`);
    
    const results = {
      totalEmbeddings: totalCount,
      truefixDirectCount: truefixResults?.length || 0,
      truefixMeetings: truefixResults || [],
      orQueryCount: orResults?.length || 0,
      orQueryResults: orResults || [],
      simpleSearchCount: simpleResults?.length || 0,
      simpleResults: simpleResults || [],
      orError: orError?.message,
      testQuery: testQuery,
      searchTerms: searchTerms,
      orConditions: orConditions
    };

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Test function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Test failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});