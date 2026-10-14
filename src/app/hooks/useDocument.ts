import axios from 'axios';
import { useState, useEffect } from 'react';

export interface DocumentDataType {
    date?: string;
    status?: string;
    text?: string;
    content?: any;
    title?: string;
    _id?: string;
    language?: string;
    version?: number;
}

const useDocument = (_id: string, document_id: string) => {
    const [error, setError] = useState('');
    const [document, setDocument] = useState<DocumentDataType | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!_id || !document_id) return;
        setIsLoading(true);
        setIsLoaded(false);
        setError('');

        axios.get(`/api/document/${_id}/${document_id}`)
            .then(({ data }) => {
                if (data && !data.error) {
                    setDocument(data);
                    setError('');
                    setIsLoaded(true);
                } else {
                    setError(data.error || 'Failed to load document');
                    setIsLoaded(false);
                }
            })
            .catch((err) => {
                setError(err.response?.data?.error || 'Failed to load document');
                setIsLoaded(false);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [_id, document_id]);

    return { document, error, isLoading, isLoaded, setDocument };
};

export default useDocument;