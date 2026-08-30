import axios from 'axios';
import { useState, useEffect } from 'react';

interface DataType {
    date?: string;
    status?: string;
    text?: string;
    title?: string;
    _id?: string;
    language?: string;
}

const DEFAULT_DOC: DataType = {
    _id: "demo_doc_1",
    title: "Quarterly_AI_Strategy.docx",
    text: "Executive Summary: In modern software engineering and content generation, friction during draft creation limits creativity. writ.ai introduces an ethereal glassmorphic workspace that automatically evaluates correctness, tone, and conciseness in real-time.\n\nThe integration of generative models into the core workflow has yielded significant productivity gains. However, teh initial rollout faced some resistance due to delayed training resources.\n\nMoving forward, our strategy relies on leveraging AI tools for enhancing creative output while keeping the human element central to operations.",
    status: "created",
    language: "American English"
};

const useDocument = (_id: string, document_id: string) => {
    const [error, setError] = useState('');
    const [document, setDocument] = useState<DataType>(DEFAULT_DOC);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!_id || !document_id) return;
        setIsLoading(true);
        axios.get(`/api/document/${_id}/${document_id}`)
            .then(({ data }) => {
                if (data && !data.error) {
                    setDocument(data);
                    setError('');
                }
            })
            .catch(() => {
                // Silently keep DEFAULT_DOC on network issues
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [_id, document_id]);

    return { document, error, isLoading, setDocument };
};

export default useDocument;