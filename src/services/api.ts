import { ApiResponse, ApiSearchResponse, ApiHealthResponse, Meeting, ApiDocument } from '@/types/api';

// Replace with your actual QNAP public IP/URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new ApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new ApiError('API returned unsuccessful response');
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

// Transform API document to Meeting format for UI compatibility
function transformApiDocumentToMeeting(doc: ApiDocument): Meeting {
  // Extract topics from summary (simple approach - you can enhance this)
  const topics = extractTopicsFromSummary(doc.summary);
  const keyDecisions = extractDecisionsFromSummary(doc.summary);
  
  return {
    id: doc.id,
    title: doc.title,
    date: new Date(doc.date).toLocaleDateString(),
    time: new Date(doc.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attendees: 0, // Not available in API
    topics,
    summary: doc.summary,
    keyDecisions,
    body: doc.body,
    type: doc.type,
    aiGenerated: doc.ai_generated,
    url: doc.url,
    status: 'Completed', // Default status
  };
}

// Helper function to extract topics from summary (basic implementation)
function extractTopicsFromSummary(summary: string): string[] {
  // Look for common patterns in summaries to extract topics
  const commonTopics = [
    'Budget', 'Zoning', 'Development', 'Traffic', 'Parks', 'Public Safety',
    'Planning', 'Environment', 'Transportation', 'Housing', 'Emergency',
    'Fire Safety', 'Police', 'Infrastructure', 'Community'
  ];
  
  return commonTopics.filter(topic => 
    summary.toLowerCase().includes(topic.toLowerCase())
  ).slice(0, 4); // Limit to 4 topics
}

// Helper function to extract decisions from summary (basic implementation)
function extractDecisionsFromSummary(summary: string): string[] {
  // Look for decision indicators in the summary
  const decisionPatterns = [
    /approved?\s+([^.]+)/gi,
    /voted?\s+to\s+([^.]+)/gi,
    /decided?\s+to\s+([^.]+)/gi,
    /passed?\s+([^.]+)/gi,
  ];
  
  const decisions: string[] = [];
  
  decisionPatterns.forEach(pattern => {
    const matches = summary.match(pattern);
    if (matches) {
      matches.forEach(match => {
        decisions.push(match.charAt(0).toUpperCase() + match.slice(1));
      });
    }
  });
  
  return decisions.slice(0, 3); // Limit to 3 decisions
}

export const apiService = {
  // Health check
  async checkHealth(): Promise<ApiHealthResponse> {
    return fetchApi<ApiHealthResponse>('/api/health');
  },

  // Get current summaries
  async getCurrentSummaries(): Promise<Meeting[]> {
    const response = await fetchApi<ApiResponse>('/api/current');
    const meetings: Meeting[] = [];
    
    // Transform API response to Meeting format
    Object.entries(response.data).forEach(([bodyName, bodyData]) => {
      [...bodyData.agendas, ...bodyData.minutes].forEach(doc => {
        meetings.push(transformApiDocumentToMeeting(doc));
      });
    });
    
    // Sort by date (newest first)
    return meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Get archive data
  async getArchiveSummaries(): Promise<Meeting[]> {
    const response = await fetchApi<ApiResponse>('/api/archive');
    const meetings: Meeting[] = [];
    
    Object.entries(response.data).forEach(([bodyName, bodyData]) => {
      [...bodyData.agendas, ...bodyData.minutes].forEach(doc => {
        meetings.push(transformApiDocumentToMeeting(doc));
      });
    });
    
    return meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Get all data
  async getAllSummaries(): Promise<Meeting[]> {
    const response = await fetchApi<ApiResponse>('/api/all');
    const meetings: Meeting[] = [];
    
    Object.entries(response.data).forEach(([bodyName, bodyData]) => {
      [...bodyData.agendas, ...bodyData.minutes].forEach(doc => {
        meetings.push(transformApiDocumentToMeeting(doc));
      });
    });
    
    return meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Search
  async searchDocuments(query: string, body?: string, type?: string): Promise<Meeting[]> {
    const params = new URLSearchParams({ q: query });
    if (body) params.append('body', body);
    if (type) params.append('type', type);
    
    const response = await fetchApi<ApiSearchResponse>(`/api/search?${params.toString()}`);
    
    return response.data.map(transformApiDocumentToMeeting);
  },

  // Get government bodies
  async getGovernmentBodies(): Promise<string[]> {
    const response = await fetchApi<{ success: boolean; data: string[] }>('/api/bodies');
    return response.data;
  },
};