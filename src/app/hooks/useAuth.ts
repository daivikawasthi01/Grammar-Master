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
                setIsLogged(response.data.isAuthenticated);
                setError('');
            } catch (err: any) {
                setIsLogged(false);
                setError(err.response?.data?.error || 'Authentication failed');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    return { isLogged, error, isLoading };
};

export default useAuth;
