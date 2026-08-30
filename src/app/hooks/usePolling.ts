import { useState, useEffect } from 'react';
import axios from 'axios';
import { PollingData } from '../types/data';

const DEFAULT_DEMO_USER: PollingData = {
  _id: "demo123",
  email: "demo@writ.ai",
  name: "Writ AI User",
  plan: "pro",
  prompts: 2450,
  documents: [
    {
      _id: "demo_doc_1",
      title: "Quarterly_AI_Strategy.docx",
      text: "Executive Summary: In modern software engineering and content generation, friction during draft creation limits creativity. writ.ai introduces an ethereal glassmorphic workspace that automatically evaluates correctness, tone, and conciseness in real-time.",
      status: "created",
      language: "American English"
    }
  ],
  trashs: []
};

const usePolling = () => {
  const [data, setData] = useState<PollingData>(DEFAULT_DEMO_USER);
  const [errorPoll, setErrorPoll] = useState('');

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/user');
      if (response.data && !response.data.error) {
        setData(response.data);
        setErrorPoll('');
      }
    } catch (err: any) {
      // Keep DEFAULT_DEMO_USER if network or DB issue occurs
    }
  };

  const mutate = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return { data, errorPoll, mutate };
};

export default usePolling;