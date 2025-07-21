// LCF Civic Summaries API Service

// Mobile-friendly API configuration
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const getApiUrl = () => {
  if (isMobile()) {
    // Use mobile API URL (HTTP) to avoid certificate issues
    return import.meta.env.VITE_API_URL_MOBILE || 'http://hueyphanclub.myqnapcloud.com:8080';
  } else {
    // Use desktop API URL (HTTPS)
    return import.meta.env.VITE_API_URL_DESKTOP || 'https://hueyphanclub.myqnapcloud.com:8443';
  }
};

// Use in your API calls
const API_BASE_URL = import.meta.env.VITE_API_URL || getApiUrl();

export interface CivicSummary {
  id: string;
  title: string;
  government_body: string;
  date: string; // API returns 'date', not 'meeting_date'
  document_type: string;
  summary: string;
  ai_generated: boolean;
  created_at?: string;
  processed_at?: string;
  content_length?: number;
  summary_length?: number;
  key_topics?: string[];
  source_url?: string;
  pdf_url?: string;
}

export interface CivicStatistics {
  total_documents: number;
  government_bodies: number;
  ai_summaries: number;
  recent_updates: number;
}

export interface SummariesResponse {
  summaries: CivicSummary[];
  statistics: CivicStatistics;
  last_updated: string;
  total_count: number;
}

export interface ArchiveResponse {
  archive: Record<string, CivicSummary[]>;
  statistics: {
    total_documents: number;
    months_covered: number;
    government_bodies: number;
    ai_summaries: number;
  };
  last_updated: string;
}

export interface SearchResponse {
  query: string;
  government_body?: string;
  results: CivicSummary[];
  total_count: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  environment: string;
  version: string;
}

class CivicApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async fetchWithErrorHandling(endpoint: string): Promise<any> {
    const endpoints = [
      `https://hueyphanclub.myqnapcloud.com:8443${endpoint}`,
      `http://hueyphanclub.myqnapcloud.com:8080${endpoint}`
    ];
    
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          // Add timeout for mobile
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.log(`Failed to fetch from ${url}:`, error);
        continue;
      }
    }
    
    throw new Error('All API endpoints failed');
  }

  private async fetchWithRetry(endpoint: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.fetchWithErrorHandling(endpoint);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  // Health check
  async checkHealth(): Promise<HealthResponse> {
    return this.fetchWithErrorHandling('/api/health');
  }

  // Get current meeting summaries
  async getCurrentSummaries(): Promise<SummariesResponse> {
    return this.fetchWithRetry('/api/summaries');
  }

  // Get historical archive
  async getArchive(): Promise<ArchiveResponse> {
    return this.fetchWithRetry('/api/archive');
  }

  // Search summaries
  async searchSummaries(query: string, governmentBody = ''): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (governmentBody) {
      params.append('body', governmentBody);
    }
    return this.fetchWithRetry(`/api/search?${params}`);
  }

  // Get government bodies
  async getGovernmentBodies(): Promise<{ government_bodies: string[]; current_count: number; archive_count: number; total_count: number }> {
    return this.fetchWithRetry('/api/government-bodies');
  }
}

export const civicApi = new CivicApiService();