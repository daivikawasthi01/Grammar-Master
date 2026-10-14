import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PollingData } from '../types/data';

const usePolling = () => {
  const [data, setData] = useState<PollingData | null>(null);
  const [errorPoll, setErrorPoll] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get('/api/user');
      if (response.data && !response.data.error) {
        setData(response.data);
        setErrorPoll('');
      } else {
        setErrorPoll(response.data?.error || 'Failed to load user data');
      }
    } catch (err: any) {
      setErrorPoll(err.response?.data?.error || 'Network error fetching user data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const mutate = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // Refetch on window focus rather than aggressive 5-second polling interval
    const onFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchData]);

  return { data, errorPoll, isLoading, mutate };
};

export default usePolling;