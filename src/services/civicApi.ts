// LCF Civic Summaries API Service

// ALWAYS get fresh mobile detection on each call
const isMobileDevice = () => {
  const userAgent = navigator.userAgent;
  const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  console.log('=== MOBILE DETECTION ===');
  console.log('User Agent:', userAgent);
  console.log('Is Mobile:', mobile);
  console.log('========================');
  return mobile;
};

const getApiUrl = () => {
  const isMobile = isMobileDevice();
  const url = isMobile 
    ? 'http://hueyphanclub.myqnapcloud.com:8080'   // HTTP for mobile
    : 'https://hueyphanclub.myqnapcloud.com:8443'; // HTTPS for desktop
  
  console.log('=== API URL SELECTION ===');
  console.log('Selected URL:', url);
  console.log('==========================');
  return url;
};

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

// Direct fetch functions instead of class
const fetchCivicData = async (endpoint: string): Promise<any> => {
  const baseUrl = getApiUrl();
  const separator = endpoint.includes('?') ? '&' : '?';
  const cacheBuster = `${separator}_t=${Date.now()}`;
  const fullUrl = `${baseUrl}${endpoint}${cacheBuster}`;
  
  console.log('=== FETCH REQUEST ===');
  console.log('Full URL:', fullUrl);
  console.log('=====================');
  
  const response = await fetch(fullUrl, {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};

// Export direct functions
export const getCurrentSummaries = (): Promise<SummariesResponse> => 
  fetchCivicData('/api/summaries');

export const getArchive = (): Promise<ArchiveResponse> => 
  fetchCivicData('/api/archive');

export const searchSummaries = (query: string, governmentBody = ''): Promise<SearchResponse> => {
  const params = new URLSearchParams({ q: query });
  if (governmentBody) {
    params.append('body', governmentBody);
  }
  return fetchCivicData(`/api/search?${params}`);
};

export const getGovernmentBodies = (): Promise<{ government_bodies: string[]; current_count: number; archive_count: number; total_count: number }> => 
  fetchCivicData('/api/government-bodies');

export const checkHealth = (): Promise<HealthResponse> => 
  fetchCivicData('/api/health');

// Legacy class for backward compatibility
class CivicApiService {
  async getCurrentSummaries(): Promise<SummariesResponse> {
    return getCurrentSummaries();
  }

  async getArchive(): Promise<ArchiveResponse> {
    return getArchive();
  }

  async searchSummaries(query: string, governmentBody = ''): Promise<SearchResponse> {
    return searchSummaries(query, governmentBody);
  }

  async getGovernmentBodies(): Promise<{ government_bodies: string[]; current_count: number; archive_count: number; total_count: number }> {
    return getGovernmentBodies();
  }

  async checkHealth(): Promise<HealthResponse> {
    return checkHealth();
  }
}

export const civicApi = new CivicApiService();