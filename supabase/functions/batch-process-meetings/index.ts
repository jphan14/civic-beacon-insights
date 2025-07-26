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

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Utility function for exponential backoff delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delayMs = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`, error.message);
      await delay(delayMs);
    }
  }
  throw new Error('Max retries exceeded');
}

// Rate-limited fetch with retry
async function fetchWithRateLimit(url: string, options?: RequestInit): Promise<Response> {
  return await retryWithBackoff(async () => {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
      console.log(`Rate limited, waiting ${waitTime}ms before retry`);
      await delay(waitTime);
      throw new Error('Rate limited - will retry');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, 5, 2000); // 5 retries with 2s base delay
}

// Generate embedding with retry and rate limiting
async function generateEmbedding(content: string): Promise<number[]> {
  return await retryWithBackoff(async () => {
    const response = await fetchWithRateLimit('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: content,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }, 3, 1000); // 3 retries with 1s base delay
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 10, startPage = 1 } = await req.json().catch(() => ({}));
    
    console.log(`🚀 Starting optimized batch processing from page ${startPage} with batch size ${batchSize}`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let currentPage = startPage;
    let hasMorePages = true;
    const startTime = Date.now();
    
    // Process in smaller chunks to avoid timeouts
    const maxProcessingTime = 540000; // 9 minutes (Supabase edge function limit is 10 min)
    
    while (hasMorePages && processedCount < batchSize && (Date.now() - startTime) < maxProcessingTime) {
      console.log(`📄 Fetching page ${currentPage} from civic API...`);
      
      try {
        // Fetch meetings with rate limiting
        const civicResponse = await fetchWithRateLimit(
          `https://stocks-salon-chen-plaintiff.trycloudflare.com/api/summaries?page=${currentPage}&limit=20`
        );
        
        const civicData = await civicResponse.json();
        const meetings = civicData.summaries || [];
        
        console.log(`📋 Found ${meetings.length} meetings on page ${currentPage}`);
        
        if (meetings.length === 0) {
          console.log(`✅ No more meetings found, stopping at page ${currentPage}`);
          hasMorePages = false;
          break;
        }
        
        // Process meetings in smaller batches to handle rate limits better
        for (let i = 0; i < meetings.length && processedCount < batchSize; i++) {
          const meeting = meetings[i];
          
          if ((Date.now() - startTime) > maxProcessingTime) {
            console.log(`⏰ Approaching time limit, stopping processing`);
            break;
          }
          
          try {
            console.log(`🔄 Processing meeting ${processedCount + 1}/${batchSize}: ${meeting.title} (${meeting.date})`);
            
            // Check if this meeting already exists
            const { data: existingEmbedding, error: checkError } = await supabase
              .from('document_embeddings')
              .select('id')
              .eq('meeting_id', meeting.id || meeting.meeting_id)
              .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
              throw new Error(`Database check failed: ${checkError.message}`);
            }
            
            if (existingEmbedding) {
              console.log(`⏭️  Meeting already processed, skipping: ${meeting.title}`);
              skippedCount++;
              continue;
            }
            
            // Get content with fallback
            const fullContent = meeting.content || meeting.summary || '';
            
            if (!fullContent || fullContent.length < 50) {
              console.log(`⚠️  Insufficient content for meeting: ${meeting.title}`);
              skippedCount++;
              continue;
            }
            
            // Format content for embedding
            const contentForEmbedding = `
Title: ${meeting.title}
Date: ${meeting.date}
Commission: ${meeting.commission}
Government Body: ${meeting.government_body}
Meeting Type: ${meeting.document_type}
Full Content: ${fullContent}
            `.trim();
            
            console.log(`📝 Content length: ${contentForEmbedding.length} characters`);
            
            // Generate embedding with retry logic
            const embedding = await generateEmbedding(contentForEmbedding);
            
            // Insert with retry logic
            await retryWithBackoff(async () => {
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
                throw new Error(`Database insert failed: ${insertError.message}`);
              }
            }, 3, 500);
            
            console.log(`✅ Successfully processed: ${meeting.title}`);
            processedCount++;
            
            // Add progressive delay to be respectful to APIs
            const delayTime = Math.min(200 + (processedCount * 10), 1000);
            await delay(delayTime);
            
          } catch (error) {
            console.error(`❌ Failed to process meeting ${meeting.title}:`, error.message);
            errorCount++;
            
            // Continue processing other meetings even if one fails
            if (errorCount > 10) {
              console.log(`🛑 Too many errors (${errorCount}), stopping batch`);
              break;
            }
          }
        }
        
        currentPage++;
        
        // Add delay between pages to avoid overwhelming the API
        await delay(500);
        
      } catch (error) {
        console.error(`❌ Error fetching page ${currentPage}:`, error.message);
        
        // If we can't fetch a page, try the next one
        currentPage++;
        errorCount++;
        
        if (errorCount > 5) {
          console.log(`🛑 Too many page fetch errors, stopping`);
          break;
        }
        
        // Wait longer before retrying
        await delay(2000);
      }
    }
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    const result = {
      success: true,
      processedCount,
      skippedCount,
      errorCount,
      totalAttempted: processedCount + skippedCount + errorCount,
      pagesChecked: currentPage - startPage,
      duration: `${duration}s`,
      stopped_reason: hasMorePages ? 
        (processedCount >= batchSize ? 'batch_limit_reached' : 'time_limit_approached') : 
        'no_more_meetings'
    };
    
    console.log(`🎉 Batch processing complete:`, result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Critical error in batch processing:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Batch processing failed',
      details: error.message,
      processedCount: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});