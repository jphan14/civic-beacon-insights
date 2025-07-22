import { useState, useEffect, useCallback } from 'react';
import { civicApi, type CivicSummary, type CivicStatistics, type ArchiveResponse, type PaginationInfo, type SummariesResponse, type SearchResponse } from '../services/civicApi';

// Enhanced hook for paginated summaries with filtering
export const useCivicSummaries = (options: {
  page?: number;
  limit?: number;
  commission?: string[];
  year?: number[];
  ai_enhanced?: boolean;
  template_enhanced?: boolean;
} = {}) => {
  const [summaries, setSummaries] = useState<CivicSummary[]>([]);
  const [statistics, setStatistics] = useState<CivicStatistics>({} as CivicStatistics);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummariesDirect = useCallback(async (fetchOptions = options) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await civicApi.fetchSummaries(fetchOptions);
      setSummaries(data.summaries || []);
      setStatistics(data.statistics || {} as CivicStatistics);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSummaries([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const refetch = useCallback(async () => {
    await fetchSummariesDirect();
  }, [fetchSummariesDirect]);

  useEffect(() => {
    fetchSummariesDirect();
  }, [fetchSummariesDirect]);

  return { summaries, statistics, pagination, loading, error, refetch };
};

// Simple hook for backward compatibility
export const useCivicSummariesSimple = () => {
  return useCivicSummaries({ limit: 20 });
};

export const useCivicArchive = () => {
  const [archive, setArchive] = useState<Record<string, CivicSummary[]>>({});
  const [statistics, setStatistics] = useState<ArchiveResponse['statistics']>({} as ArchiveResponse['statistics']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArchive = async () => {
      try {
        setLoading(true);
        const data = await civicApi.getArchive();
        setArchive(data.archive || {});
        setStatistics(data.statistics || {} as ArchiveResponse['statistics']);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch archive');
        setArchive({});
      } finally {
        setLoading(false);
      }
    };

    fetchArchive();
  }, []);

  return { archive, statistics, loading, error };
};

export const useGovernmentBodies = () => {
  const [bodies, setBodies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBodies = async () => {
      try {
        setLoading(true);
        const data = await civicApi.getGovernmentBodies();
        setBodies(data.government_bodies || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch government bodies');
        setBodies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBodies();
  }, []);

  return { bodies, loading, error };
};

// Enhanced search hook with pagination and advanced filtering
export const useCivicSearch = () => {
  const [results, setResults] = useState<CivicSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');

  const search = useCallback(async (
    query: string, 
    options: {
      page?: number;
      limit?: number;
      commission?: string[];
      year?: number[];
      ai_enhanced?: boolean;
      contentTypes?: string[];
    } = {}
  ) => {
    if (!query.trim()) {
      setResults([]);
      setPagination(null);
      setLastQuery('');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLastQuery(query);
      
      const data = await civicApi.searchSummaries(query, options);
      setResults(data.results || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setResults([]);
    setPagination(null);
    setLastQuery('');
    setError(null);
  }, []);

  return { results, pagination, loading, error, lastQuery, search, clearSearch };
};

// Hook for getting meeting details
export const useMeetingDetails = (meetingId: string | null) => {
  const [meeting, setMeeting] = useState<CivicSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) {
      setMeeting(null);
      return;
    }

    const fetchMeeting = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await civicApi.getMeetingDetails(meetingId);
        setMeeting(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch meeting details');
        setMeeting(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingId]);

  return { meeting, loading, error };
};