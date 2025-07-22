// Civic Beacon Insights API Service
// Based on Lovable Integration Guide v2.0

// Use Cloudflare Tunnel URL for secure access to local Civic Beacon system
const API_BASE_URL = 'https://brutal-hdtv-lets-giants.trycloudflare.com';

export interface CivicSummary {
  id: string;
  title: string;
  government_body: string;
  date: string;
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

/**
 * Civic Beacon API Class
 * Implements the integration patterns from the Lovable Integration Guide
 */
class CivicBeaconAPI {
  private baseUrl: string;
  private defaultTimeout: number;
  private maxRetries: number;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = 15000; // 15 seconds
    this.maxRetries = 3;
  }

  /**
   * Core fetch method with retry logic and comprehensive error handling
   */
  private async fetchWithRetry(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      // Implement retry logic for transient failures
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(endpoint, options, retryCount + 1);
      }

      // Enhance error messages for better debugging
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.defaultTimeout}ms. Please check your connection and try again.`);
        }
        if (error.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to the civic data server. Please check your internet connection.');
        }
      }

      throw error;
    }
  }

  /**
   * Determines if an error is worth retrying
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      // Retry on network errors but not on timeout
      return error.message.includes('fetch') && !error.name.includes('Abort');
    }
    return false;
  }

  /**
   * Fetches meeting summaries with optional filtering
   */
  async fetchSummaries(filters: Record<string, string> = {}): Promise<SummariesResponse> {
    const params = new URLSearchParams(filters);
    const endpoint = `/api/summaries${params.toString() ? `?${params}` : ''}`;
    return this.fetchWithRetry(endpoint);
  }

  /**
   * Searches summaries with query and optional filters
   */
  async searchSummaries(query: string, filters: Record<string, string> = {}): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query, ...filters });
    return this.fetchWithRetry(`/api/search?${params}`);
  }

  /**
   * Gets list of government bodies
   */
  async getGovernmentBodies(): Promise<{ government_bodies: string[]; current_count: number; archive_count: number; total_count: number }> {
    return this.fetchWithRetry('/api/government-bodies');
  }

  /**
   * Gets archived summaries
   */
  async getArchive(): Promise<ArchiveResponse> {
    return this.fetchWithRetry('/api/archive');
  }

  /**
   * Gets system health status
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.fetchWithRetry('/api/health');
  }

  /**
   * Gets metadata about the dataset
   */
  async getMetadata(): Promise<any> {
    return this.fetchWithRetry('/api/metadata');
  }

  /**
   * Gets detailed statistics
   */
  async getStatistics(): Promise<any> {
    return this.fetchWithRetry('/api/stats');
  }

  /**
   * Triggers data refresh
   */
  async refreshData(): Promise<any> {
    return this.fetchWithRetry('/api/refresh', { method: 'POST' });
  }
}

// Create singleton instance
export const civicApi = new CivicBeaconAPI();

// Export individual functions for backward compatibility
export const getCurrentSummaries = (filters?: Record<string, string>): Promise<SummariesResponse> => 
  civicApi.fetchSummaries(filters);

export const getArchive = (): Promise<ArchiveResponse> => 
  civicApi.getArchive();

export const searchSummaries = (query: string, governmentBody = ''): Promise<SearchResponse> => {
  const filters = governmentBody ? { government_body: governmentBody } : {};
  return civicApi.searchSummaries(query, filters);
};

export const getGovernmentBodies = (): Promise<{ government_bodies: string[]; current_count: number; archive_count: number; total_count: number }> => 
  civicApi.getGovernmentBodies();

export const checkHealth = (): Promise<HealthResponse> => 
  civicApi.checkHealth();

// Export the API class for advanced usage
export { CivicBeaconAPI };