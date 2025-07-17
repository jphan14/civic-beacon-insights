import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { Meeting } from '@/types/api';

export const useCurrentSummaries = (): UseQueryResult<Meeting[], Error> => {
  return useQuery({
    queryKey: ['current-summaries'],
    queryFn: apiService.getCurrentSummaries,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useArchiveSummaries = (): UseQueryResult<Meeting[], Error> => {
  return useQuery({
    queryKey: ['archive-summaries'],
    queryFn: apiService.getArchiveSummaries,
    staleTime: 30 * 60 * 1000, // 30 minutes (archive data changes less frequently)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useAllSummaries = (): UseQueryResult<Meeting[], Error> => {
  return useQuery({
    queryKey: ['all-summaries'],
    queryFn: apiService.getAllSummaries,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useGovernmentBodies = (): UseQueryResult<string[], Error> => {
  return useQuery({
    queryKey: ['government-bodies'],
    queryFn: apiService.getGovernmentBodies,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 3,
  });
};

export const useSearchDocuments = (query: string, body?: string, type?: string) => {
  return useQuery({
    queryKey: ['search-documents', query, body, type],
    queryFn: () => apiService.searchDocuments(query, body, type),
    enabled: query.length > 2, // Only search if query is longer than 2 characters
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};