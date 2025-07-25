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
    console.log('AI Chat request received...');

    // Check if OpenAI API key is available
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { 
      message, 
      session_id,
      search_context = true,
      max_context_results = 3 
    } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing message: "${message}" for session: ${session_id}`);

    let contextResults: any[] = [];

    // If search_context is enabled, perform semantic search for relevant context
    if (search_context) {
      console.log('Performing semantic search for context...');

      const searchResponse = await fetch(`${supabaseUrl}/functions/v1/semantic-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          limit: max_context_results,
          threshold: 0.7,
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        contextResults = searchData.results || [];
        console.log(`Found ${contextResults.length} relevant documents for context`);
      } else {
        console.warn('Search request failed, proceeding without context');
      }
    }

    // Build the context string from search results
    const contextString = contextResults.length > 0 
      ? contextResults.map((result, index) => 
          `[Document ${index + 1} - Meeting ${result.meeting_id}]:\n${result.content}`
        ).join('\n\n')
      : '';

    // Build the system prompt
    const systemPrompt = `You are a helpful AI assistant that answers questions about civic meetings and government proceedings. You have access to meeting summaries, decisions, and discussions from various government bodies.

When answering questions:
1. Use only the information provided in the context documents
2. If you don't know something from the context, say so clearly
3. Cite specific meetings or documents when referencing information
4. Be concise but thorough
5. Focus on factual information from the meetings

${contextString ? `Context Documents:\n${contextString}\n\n` : ''}

Answer the user's question based on the available information.`;

    console.log('Sending request to OpenAI...');

    // Get AI response from OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    const aiResponse = openAIData.choices[0].message.content;

    console.log('AI response generated successfully');

    // Save the conversation to the database if session_id is provided
    if (session_id) {
      try {
        // Save user message
        await supabase
          .from('chat_messages')
          .insert({
            session_id,
            role: 'user',
            content: message,
            metadata: { context_used: contextResults.length > 0 }
          });

        // Save AI response
        await supabase
          .from('chat_messages')
          .insert({
            session_id,
            role: 'assistant',
            content: aiResponse,
            metadata: { 
              context_documents: contextResults.length,
              relevant_meetings: contextResults.map(r => r.meeting_id)
            }
          });

        console.log('Conversation saved to database');
      } catch (dbError) {
        console.warn('Failed to save conversation to database:', dbError);
        // Continue anyway - don't fail the response for DB issues
      }
    }

    // Track the query for analytics
    const relevantMeetings = contextResults.map(r => r.meeting_id);
    try {
      await supabase
        .from('user_queries')
        .insert({
          query: message,
          session_id,
          relevant_meetings: relevantMeetings,
          response_time_ms: Date.now() - Date.now(), // Placeholder
        });
    } catch (analyticsError) {
      console.warn('Failed to track query analytics:', analyticsError);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        context_documents: contextResults.length,
        relevant_meetings: relevantMeetings,
        session_id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in AI chat:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});