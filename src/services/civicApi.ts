// Civic Beacon Insights API Service
// Based on Lovable Integration Guide v2.0

// Use Cloudflare Tunnel URL for secure access to local Civic Beacon system
const API_BASE_URL = 'https://stocks-salon-chen-plaintiff.trycloudflare.com';

export interface CivicSummary {
  id: string;
  title: string;
  government_body: string;
  commission: string;
  date: string;
  year: number;
  time?: string;
  location?: string;
  meeting_type?: string;
  document_type: string;
  summary: string;
  ai_generated?: boolean;
  ai_enhanced?: boolean;
  template_enhanced?: boolean;
  created_at?: string;
  processed_at?: string;
  content_length?: number;
  summary_length?: number;
  key_topics?: string[];
  source_url?: string;
  pdf_url?: string;
  agenda_url?: string;
  minutes_url?: string;
  video_url?: string;
  url?: string;
  ai_insights?: {
    has_key_decisions?: boolean;
    has_action_items?: boolean;
    has_financial_implications?: boolean;
    key_topics?: string[];
    public_impact?: string;
  };
  ai_analysis?: {
    key_decisions?: Array<{
      decision: string;
      vote_result?: string;
      impact?: string;
    }>;
    action_items?: Array<{
      action: string;
      responsible_party?: string;
      timeline?: string;
    }>;
    financial_implications?: Array<{
      item: string;
      amount?: string;
      impact?: string;
    }>;
    public_impact?: string;
    next_steps?: string;
  };
  source?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface EnhancedMetadata {
  ai_enhanced_available: number;
  template_enhanced_available: number;
}

export interface CivicStatistics {
  total_documents?: number;
  total_meetings?: number;
  government_bodies?: number;
  ai_summaries?: number;
  ai_enhanced_count?: number;
  template_enhanced_count?: number;
  recent_updates?: number;
  version?: string;
  commission_breakdown?: Record<string, number>;
}

export interface SummariesResponse {
  summaries: CivicSummary[];
  statistics?: CivicStatistics;
  pagination?: PaginationInfo;
  metadata?: EnhancedMetadata;
  last_updated?: string;
  total_count?: number;
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
  pagination?: PaginationInfo;
}

export interface HealthResponse {
  status: string;
  total_meetings?: number;
  ai_enhanced_count?: number;
  template_enhanced_count?: number;
  version?: string;
  timestamp?: string;
  environment?: string;
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
   * Fetches meeting summaries with pagination and filtering support
   */
  async fetchSummaries(options: {
    page?: number;
    limit?: number;
    commission?: string[];
    year?: number[];
    ai_enhanced?: boolean;
    template_enhanced?: boolean;
    [key: string]: any;
  } = {}): Promise<SummariesResponse> {
    const params = new URLSearchParams();
    
    if (options.page) params.set('page', options.page.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.commission?.length) {
      // Handle single commission vs multiple commissions
      if (options.commission.length === 1) {
        params.set('commission', options.commission[0]);
      } else {
        params.set('commission', options.commission.join(','));
      }
    }
    if (options.year?.length) params.set('year', options.year.join(','));
    if (options.ai_enhanced !== undefined) params.set('ai_enhanced', options.ai_enhanced.toString());
    if (options.template_enhanced !== undefined) params.set('template_enhanced', options.template_enhanced.toString());
    
    // Add any other filters
    Object.entries(options).forEach(([key, value]) => {
      if (!['page', 'limit', 'commission', 'year', 'ai_enhanced', 'template_enhanced'].includes(key) && value !== undefined) {
        params.set(key, value.toString());
      }
    });

    const endpoint = `/api/summaries${params.toString() ? `?${params}` : ''}`;
    return this.fetchWithRetry(endpoint);
  }

  /**
   * Searches summaries with query and optional filters
   */
  async searchSummaries(query: string, options: {
    page?: number;
    limit?: number;
    commission?: string[];
    year?: number[];
    ai_enhanced?: boolean;
    contentTypes?: string[];
    [key: string]: any;
  } = {}): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query });
    
    if (options.page) params.set('page', options.page.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.commission?.length) params.set('commission', options.commission.join(','));
    if (options.year?.length) params.set('year', options.year.join(','));
    if (options.ai_enhanced !== undefined) params.set('ai_enhanced', options.ai_enhanced.toString());
    if (options.contentTypes?.length) params.set('content_types', options.contentTypes.join(','));
    
    // Add any other filters
    Object.entries(options).forEach(([key, value]) => {
      if (!['page', 'limit', 'commission', 'year', 'ai_enhanced', 'contentTypes'].includes(key) && value !== undefined) {
        params.set(key, value.toString());
      }
    });

    return this.fetchWithRetry(`/api/search?${params}`);
  }

  /**
   * Gets details for a specific meeting
   */
  async getMeetingDetails(meetingId: string): Promise<CivicSummary> {
    return this.fetchWithRetry(`/api/summaries/${meetingId}`);
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
   * Gets detailed statistics including commission breakdown
   */
  async getStatistics(): Promise<CivicStatistics & { commission_breakdown: Record<string, number> }> {
    return this.fetchWithRetry('/api/statistics');
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

// Export individual functions for backward compatibility and new enhanced functions
export const getCurrentSummaries = (options?: Parameters<typeof civicApi.fetchSummaries>[0]): Promise<SummariesResponse> => 
  civicApi.fetchSummaries(options);

export const getArchive = (): Promise<ArchiveResponse> => 
  civicApi.getArchive();

export const searchSummaries = (query: string, options?: Parameters<typeof civicApi.searchSummaries>[1]): Promise<SearchResponse> => 
  civicApi.searchSummaries(query, options);

export const getMeetingDetails = (meetingId: string): Promise<CivicSummary> =>
  civicApi.getMeetingDetails(meetingId);

export const getGovernmentBodies = (): Promise<{ government_bodies: string[]; current_count: number; archive_count: number; total_count: number }> => 
  civicApi.getGovernmentBodies();

export const getStatistics = (): Promise<CivicStatistics & { commission_breakdown: Record<string, number> }> => 
  civicApi.getStatistics();

export const checkHealth = (): Promise<HealthResponse> => 
  civicApi.checkHealth();

// Export the API class for advanced usage
export { CivicBeaconAPI };