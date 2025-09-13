import { useQuery } from 'react-query';
import { fireberryApiService } from '@/services/fireberry-api';
import type { Instructor } from '@/types';

export const useInstructors = () => {
  return useQuery<Instructor[]>(
    ['instructors'],
    async () => {
      const response = await fireberryApiService.fetchInstructors();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch instructors');
      }
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );
};