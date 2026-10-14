import { useState, useEffect } from 'react';
import axios from 'axios';

export interface AuthUserState {
    id?: string;
    email?: string;
    name?: string;
    plan?: string;
}

const useAuth = () => {
    const [isLogged, setIsLogged] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<AuthUserState | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        const checkAuth = async () => {
            try {
                const response = await axios.get('/api/auth/check');
                if (!mounted) return;
                if (response.data?.isAuthenticated) {
                    setIsLogged(true);
                    setUser(response.data.user || null);
                    setError('');
                } else {
                    setIsLogged(false);
                    setUser(null);
                    setError(response.data?.error || 'Not authenticated');
                }
            } catch (err: any) {
                if (!mounted) return;
                setIsLogged(false);
                setUser(null);
                setError(err.response?.data?.error || 'Authentication check failed');
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        checkAuth();
        return () => {
            mounted = false;
        };
    }, []);

    return { isLogged, isLoading, user, error };
};

export default useAuth;
