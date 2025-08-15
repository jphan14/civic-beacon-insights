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

    // Get the authorization header to verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user from the auth token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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

      const { data: searchData, error: searchError } = await supabase.functions.invoke('semantic-search', {
        body: {
          query: message,
          limit: max_context_results,
          threshold: 0.7,
        }
      });

      console.log('Search data received:', searchData);
      console.log('Search error:', searchError);
      
      if (!searchError && searchData) {
        contextResults = searchData.results || [];
        console.log(`Found ${contextResults.length} relevant documents for context`);
        console.log('Context results preview:', contextResults.map(r => ({ 
          meeting_id: r.meeting_id, 
          content_preview: r.content?.substring(0, 100) + '...' 
        })));
      } else {
        console.warn('Search request failed, proceeding without context');
        console.warn('Search error details:', searchError);
      }

      // Always try civic API search for additional context, especially for budget/meeting queries
      console.log('Searching civic API for additional context...');
      
      try {
        // Search civic API for relevant meetings
        const civicApiResponse = await fetch('https://lawyer-ne-ide-administrative.trycloudflare.com/api/search?' + new URLSearchParams({
          q: message,
          limit: '10',
        }));
        
        if (civicApiResponse.ok) {
          const civicData = await civicApiResponse.json();
          const civicResults = civicData.results || [];
          console.log(`Civic API search found ${civicResults.length} results`);
          
          // Convert civic API results to context format
          const additionalContext = civicResults.slice(0, 5).map((meeting: any) => ({
            meeting_id: meeting.id,
            content: `Meeting: ${meeting.title}
Date: ${meeting.date}
Commission: ${meeting.commission || meeting.government_body}
Document Type: ${meeting.document_type}
Summary: ${meeting.summary}
${meeting.ai_analysis?.key_decisions ? `Key Decisions: ${JSON.stringify(meeting.ai_analysis.key_decisions)}` : ''}
${meeting.ai_analysis?.financial_implications ? `Financial Implications: ${JSON.stringify(meeting.ai_analysis.financial_implications)}` : ''}
${meeting.url ? `URL: ${meeting.url}` : ''}`,
            content_type: 'civic_meeting',
            similarity_score: 0.9,
            metadata: {
              title: meeting.title,
              date: meeting.date,
              commission: meeting.commission,
              url: meeting.url,
              source: 'civic_api'
            }
          }));
          
          // Add civic API results to context, giving them priority
          contextResults = [...additionalContext, ...contextResults];
          console.log(`Total context results: ${contextResults.length}`);
        } else {
          console.warn(`Civic API search failed with status: ${civicApiResponse.status}`);
        }
      } catch (civicError) {
        console.warn('Civic API search failed:', civicError);
      }
    }

    // Build the context string from search results
    const contextString = contextResults.length > 0 
      ? contextResults.map((result, index) => 
          `[Document ${index + 1} - Meeting ${result.meeting_id}]:\n${result.content}`
        ).join('\n\n')
      : '';

    // Build the enhanced system prompt with civic-specific instructions
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const systemPrompt = `You are a civic assistant helping residents understand local government meetings and decisions in La Cañada Flintridge, California.

CURRENT CONTEXT:
- Today's date: ${currentDate.toDateString()}
- Current year: ${currentYear}
- When users ask about "this year" or "latest" information, they mean ${currentYear}

CORE INSTRUCTIONS:
- Base your responses ONLY on the provided meeting data and context documents
- If the answer is not found in the provided materials, be transparent and say "I don't have information about that in the available meeting records"
- Encourage users to attend meetings or consult official city sources for information not in your database
- Be neutral, informative, and concise in all responses

BEHAVIOR RULES:
- When a specific date or agenda item is requested, highlight it clearly from the source material
- Always cite which meeting(s) your information comes from (e.g., "According to the June 3, 2025 City Council meeting...")
- If multiple meetings discuss the same topic, mention all relevant meetings
- For questions about resolutions, ordinances, or specific agenda items, provide the exact item number when available
- When discussing financial matters, include specific amounts and budget categories mentioned in the meetings

RESPONSE FORMAT:
- Start with a direct answer when possible
- Provide relevant details from the meeting records
- End with source attribution (meeting date and type)
- If suggesting next steps, recommend attending upcoming meetings or contacting city departments

TOPICS TO PRIORITIZE:
- City Council decisions and resolutions
- Planning Commission and Design Commission actions
- Budget discussions and financial decisions
- Public works and infrastructure projects
- Zoning and development issues
- Public safety matters
- Community events and announcements

${contextString ? `CONTEXT DOCUMENTS:\n${contextString}\n\n` : ''}

Please answer the user's question based solely on the information provided above. If you cannot find relevant information in the meeting records, clearly state this limitation.`;

    console.log('Sending request to OpenAI...');

    // Get AI response from OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      
      // Handle rate limit specifically
      if (openAIResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: "I'm currently experiencing high demand and need to wait a moment before responding. Please try your question again in a few seconds.",
            context_documents: contextResults.length,
            relevant_meetings: relevantMeetings,
            source_urls: contextResults.map(r => ({
              meeting_id: r.meeting_id,
              url: r.metadata?.source_url || r.meeting_id,
              title: r.metadata?.title || 'Meeting Document',
              date: r.metadata?.date
            })),
            session_id 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    const aiResponse = openAIData.choices[0].message.content;

    console.log('AI response generated successfully');

    // Save the conversation to the database if session_id is provided
    if (session_id) {
      try {
        // First, ensure the session exists
        const { data: existingSession, error: sessionCheckError } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('id', session_id)
          .single();

        if (sessionCheckError && sessionCheckError.code === 'PGRST116') {
          // Session doesn't exist, create it
          console.log('Creating new chat session:', session_id);
          const { error: sessionCreateError } = await supabase
            .from('chat_sessions')
            .insert({
              id: session_id,
              user_id: user.id,
              title: message.substring(0, 100), // Use first part of message as title
              updated_at: new Date().toISOString()
            });

          if (sessionCreateError) {
            console.error('Failed to create session:', sessionCreateError);
            throw sessionCreateError;
          }
        } else if (sessionCheckError) {
          console.error('Error checking session:', sessionCheckError);
          throw sessionCheckError;
        }

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

    // Track the query for analytics (only if session exists)
    const relevantMeetings = contextResults.map(r => r.meeting_id);
    if (session_id) {
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
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        context_documents: contextResults.length,
        relevant_meetings: relevantMeetings,
        source_urls: contextResults.map(r => ({
          meeting_id: r.meeting_id,
          url: r.metadata?.source_url || r.meeting_id,
          title: r.metadata?.title || 'Meeting Document',
          date: r.metadata?.date
        })),
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