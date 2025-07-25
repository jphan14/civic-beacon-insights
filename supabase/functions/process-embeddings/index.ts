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
    console.log('Processing embeddings request...');

    // Check if OpenAI API key is available
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { meeting_id, content, content_type = 'summary' } = await req.json();

    if (!meeting_id || !content) {
      return new Response(
        JSON.stringify({ error: 'meeting_id and content are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing embedding for meeting ${meeting_id}, content length: ${content.length}`);

    // Generate embedding using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: content,
        encoding_format: 'float',
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${embeddingResponse.status} - ${errorText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    console.log(`Generated embedding with ${embedding.length} dimensions`);

    // Check if embedding already exists for this meeting
    const { data: existingEmbedding } = await supabase
      .from('document_embeddings')
      .select('id')
      .eq('meeting_id', meeting_id)
      .eq('content_type', content_type)
      .single();

    if (existingEmbedding) {
      // Update existing embedding
      const { error: updateError } = await supabase
        .from('document_embeddings')
        .update({
          content,
          embedding,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEmbedding.id);

      if (updateError) {
        console.error('Error updating embedding:', updateError);
        throw updateError;
      }

      console.log(`Updated existing embedding for meeting ${meeting_id}`);
    } else {
      // Insert new embedding
      const { error: insertError } = await supabase
        .from('document_embeddings')
        .insert({
          meeting_id,
          content,
          content_type,
          embedding,
          metadata: {
            model: 'text-embedding-3-small',
            content_length: content.length,
            processed_at: new Date().toISOString(),
          },
        });

      if (insertError) {
        console.error('Error inserting embedding:', insertError);
        throw insertError;
      }

      console.log(`Created new embedding for meeting ${meeting_id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        meeting_id,
        content_type,
        embedding_dimensions: embedding.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing embeddings:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process embeddings',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});