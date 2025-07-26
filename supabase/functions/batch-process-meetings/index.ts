import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 10, startPage = 1 } = await req.json().catch(() => ({}));
    
    console.log(`Starting batch processing from page ${startPage} with batch size ${batchSize}`);
    
    let processedCount = 0;
    let currentPage = startPage;
    let hasMorePages = true;
    
    while (hasMorePages && processedCount < batchSize) {
      console.log(`Fetching page ${currentPage} from civic API...`);
      
      // Fetch meetings from the civic API
      const civicResponse = await fetch(`https://stocks-salon-chen-plaintiff.trycloudflare.com/api/summaries?page=${currentPage}&limit=20`);
      
      if (!civicResponse.ok) {
        throw new Error(`Failed to fetch meetings: ${civicResponse.status}`);
      }
      
      const civicData = await civicResponse.json();
      const meetings = civicData.summaries || [];
      
      console.log(`Found ${meetings.length} meetings on page ${currentPage}`);
      
      if (meetings.length === 0) {
        hasMorePages = false;
        break;
      }
      
      for (const meeting of meetings) {
        if (processedCount >= batchSize) break;
        
        try {
          console.log(`Processing meeting: ${meeting.title} (${meeting.date})`);
          
          // Check if this meeting already exists in embeddings
          const { data: existingEmbedding } = await supabase
            .from('document_embeddings')
            .select('id')
            .eq('meeting_id', meeting.id || meeting.meeting_id)
            .single();
          
          if (existingEmbedding) {
            console.log(`Meeting already processed, skipping: ${meeting.title}`);
            continue;
          }
          
          // Use the full content field instead of summary
          const fullContent = meeting.content || meeting.summary || '';
          
          if (!fullContent) {
            console.log(`No content available for meeting: ${meeting.title}`);
            continue;
          }
          
          // Extract content for embedding (use full content)
          const contentForEmbedding = `
Title: ${meeting.title}
Date: ${meeting.date}
Commission: ${meeting.commission}
Government Body: ${meeting.government_body}
Meeting Type: ${meeting.document_type}
Full Content: ${fullContent}
          `.trim();
          
          console.log(`Content length: ${contentForEmbedding.length} characters`);
          
          // Generate embedding using OpenAI
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: contentForEmbedding,
            }),
          });
          
          if (!embeddingResponse.ok) {
            throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
          }
          
          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.data[0].embedding;
          
          // Store in database with full content
          const { error: insertError } = await supabase
            .from('document_embeddings')
            .insert({
              meeting_id: meeting.id || meeting.meeting_id,
              content: contentForEmbedding,
              content_type: meeting.content ? 'full_content' : 'summary',
              embedding: embedding,
              metadata: {
                title: meeting.title,
                date: meeting.date,
                commission: meeting.commission,
                government_body: meeting.government_body,
                document_type: meeting.document_type,
                source_url: meeting.url,
                content_length: fullContent.length,
                has_full_content: !!meeting.content,
                ai_enhanced: meeting.ai_enhanced || false
              }
            });
          
          if (insertError) {
            console.error(`Failed to insert embedding for ${meeting.title}:`, insertError);
            continue;
          }
          
          console.log(`Successfully processed: ${meeting.title}`);
          processedCount++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error processing meeting ${meeting.title}:`, error);
          continue;
        }
      }
      
      // Check if there are more pages
      hasMorePages = civicData.pagination?.has_next || false;
      currentPage++;
      
      console.log(`Completed page ${currentPage - 1}. Has more pages: ${hasMorePages}`);
    }
    
    console.log(`Batch processing completed. Processed ${processedCount} meetings.`);
    
    return new Response(JSON.stringify({
      success: true,
      processedCount,
      message: `Successfully processed ${processedCount} meetings with full content`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Batch processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});