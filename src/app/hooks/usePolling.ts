import { useState, useEffect } from 'react';
import axios from 'axios';
import { PollingData } from '../types/data';

const usePolling = () => {
  const [data, setData] = useState<PollingData | null>(null);
  const [errorPoll, setErrorPoll] = useState('');

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/user');
      if (response.data.error) {
        setErrorPoll(response.data.error);
        return;
      }
      setData(response.data);
      setErrorPoll('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch data';
      setErrorPoll(errorMessage);
      console.error('Polling error:', err);
    }
  };

  const mutate = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return { data, errorPoll, mutate };
};

export default usePolling;