import { useState, useEffect } from 'react';
import axios from 'axios';

const useAuth = () => {
    const [isLogged, setIsLogged] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await axios.get('/api/auth/check');
                if (response.data?.isAuthenticated) {
                    setIsLogged(true);
                    setError('');
                } else {
                    setIsLogged(false);
                    setError('');
                }
            } catch (err: any) {
                setIsLogged(false);
                if (err.response?.status === 401) {
                    // 401 means not logged in, not a system failure
                    setError('');
                } else {
                    setError(err.response?.data?.error || 'Authentication failed');
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    return { isLogged, error, isLoading };
};

export default useAuth;
