import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting API debug analysis...');
    
    let totalMeetings = 0;
    let meetingsWithContent = 0;
    let meetingsWithSummary = 0;
    let meetingsWithoutContent = 0;
    let currentPage = 1;
    let hasMorePages = true;
    const maxPages = 100; // Safety limit
    
    while (hasMorePages && currentPage <= maxPages) {
      console.log(`Checking page ${currentPage}...`);
      
      const response = await fetch(`https://stocks-salon-chen-plaintiff.trycloudflare.com/api/summaries?page=${currentPage}&limit=20`);
      
      if (!response.ok) {
        console.log(`API error on page ${currentPage}: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const meetings = data.summaries || [];
      
      if (meetings.length === 0) {
        console.log(`No meetings found on page ${currentPage}, stopping`);
        hasMorePages = false;
        break;
      }
      
      totalMeetings += meetings.length;
      
      // Analyze content availability
      for (const meeting of meetings) {
        if (meeting.content) {
          meetingsWithContent++;
        } else if (meeting.summary) {
          meetingsWithSummary++;
        } else {
          meetingsWithoutContent++;
        }
      }
      
      console.log(`Page ${currentPage}: ${meetings.length} meetings`);
      currentPage++;
      
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const analysis = {
      totalMeetingsFound: totalMeetings,
      pagesChecked: currentPage - 1,
      meetingsWithContent,
      meetingsWithSummary,
      meetingsWithoutContent,
      eligibleForProcessing: meetingsWithContent + meetingsWithSummary,
      percentageWithContent: Math.round((meetingsWithContent / totalMeetings) * 100),
      percentageWithSummary: Math.round((meetingsWithSummary / totalMeetings) * 100),
      percentageWithoutContent: Math.round((meetingsWithoutContent / totalMeetings) * 100)
    };
    
    console.log('Analysis complete:', analysis);
    
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in debug analysis:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to analyze API',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});