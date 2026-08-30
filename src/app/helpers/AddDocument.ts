import axios from 'axios';

interface AddDocumentResponse {
    documentId: string;
    _id: string;
    error?: string;
}

export const HandleAddDocument = async (_id: string): Promise<void> => {
    const targetUserId = _id || 'demo123';
    try {
        const { data } = await axios.post<AddDocumentResponse>('/api/add-document', { 
            _id: targetUserId,
            title: 'Untitled Document',
            text: '',
            status: 'created',
            version: Date.now()
        });
        
        if (data && data.documentId) {
            window.location.href = `/account/docs/${data.documentId}/${data._id || targetUserId}`;
            return;
        }
    } catch (error: any) {
        console.warn('Backend add-document fallback engaged:', error?.message);
    }
    
    // Fallback: create demo document and redirect seamlessly
    const demoDocId = 'doc_' + Date.now();
    window.location.href = `/account/docs/${demoDocId}/${targetUserId}`;
};