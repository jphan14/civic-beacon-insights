import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchMeetingSummaries } from '@/services/api';
import { Meeting } from '@/types/api';

export const useCurrentSummaries = (): UseQueryResult<Meeting[], Error> => {
  return useQuery({
    queryKey: ['current-summaries'],
    queryFn: fetchMeetingSummaries,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};