import { useState, useEffect } from 'react';
import { civicApi, type CivicSummary, type CivicStatistics, type ArchiveResponse } from '../services/civicApi';

export const useCivicSummaries = () => {
  const [summaries, setSummaries] = useState<CivicSummary[]>([]);
  const [statistics, setStatistics] = useState<CivicStatistics>({} as CivicStatistics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummariesDirect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use HTTPS for all devices - mixed content policy prevents HTTP from HTTPS sites
      const baseUrl = 'https://hueyphanclub.myqnapcloud.com:8443';
      
      const url = `${baseUrl}/api/summaries?_t=${Date.now()}`;
      
      console.log('=== HOOK DIRECT FETCH ===');
      console.log('URL:', url);
      console.log('========================');
      
      const response = await fetch(url, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSummaries(data.summaries || []);
      setStatistics(data.statistics || {} as CivicStatistics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch summaries';
      setError(errorMessage);
      setSummaries([]);
      console.error('Hook fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchSummariesDirect();
  };

  useEffect(() => {
    fetchSummariesDirect();
  }, []);

  return { summaries, statistics, loading, error, refetch };
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

export const useCivicSearch = () => {
  const [results, setResults] = useState<CivicSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string, governmentBody = '') => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const data = await civicApi.searchSummaries(query, governmentBody);
      setResults(data.results || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
};