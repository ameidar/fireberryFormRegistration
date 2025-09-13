import { useQuery, UseQueryResult } from 'react-query';
import { fireberryApiService } from '@/services/fireberry-api';
import type { Cohort, CohortDetails, PaginatedResponse, CohortFilters, CohortSort } from '@/types';

export const useCohorts = (
  instructorId: string,
  filters: CohortFilters = {},
  sort?: CohortSort,
  page = 1,
  pageSize = 20
): UseQueryResult<PaginatedResponse<Cohort>, Error> => {
  return useQuery(
    ['cohorts', instructorId, filters, sort, page, pageSize],
    async () => {
      const response = await fireberryApiService.fetchCohortsByInstructor(
        instructorId,
        filters,
        sort,
        page,
        pageSize
      );
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch cohorts');
      }
      return response.data;
    },
    {
      enabled: !!instructorId,
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      keepPreviousData: true, // Keep previous data while loading new page
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );
};

export const useCohortDetails = (cohortId: string): UseQueryResult<CohortDetails, Error> => {
  return useQuery(
    ['cohort-details', cohortId],
    async () => {
      const response = await fireberryApiService.fetchCohortDetails(cohortId);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch cohort details');
      }
      return response.data;
    },
    {
      enabled: !!cohortId,
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 3 * 60 * 1000, // 3 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );
};