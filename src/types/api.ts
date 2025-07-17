export interface ApiDocument {
  id: string;
  title: string;
  date: string;
  summary: string;
  url: string;
  type: 'agenda' | 'minutes';
  ai_generated: boolean;
  body: string;
}

export interface ApiBodyData {
  agendas: ApiDocument[];
  minutes: ApiDocument[];
}

export interface ApiResponse {
  success: boolean;
  data: Record<string, ApiBodyData>;
  stats: {
    total_documents: number;
    total_bodies: number;
    ai_summaries: number;
  };
}

export interface ApiSearchResponse {
  success: boolean;
  data: ApiDocument[];
  stats: {
    total_results: number;
  };
}

export interface ApiHealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  attendees: number;
  topics: string[];
  summary: string;
  keyDecisions: string[];
  body: string;
  type: 'agenda' | 'minutes';
  aiGenerated: boolean;
  url?: string;
  status?: string;
}