import axios from 'axios';

interface AddDocumentResponse {
    documentId: string;
    _id: string;
    error?: string;
}

export const HandleAddDocument = async (_id: string): Promise<void> => {
    try {
        if (!_id) {
            console.error('User ID is required');
            return;
        }

        const { data } = await axios.post<AddDocumentResponse>('/api/add-document', { 
            _id,
            title: 'Untitled Document',
            text: '',
            status: 'created',
            version: Date.now()
        });
        
        if (data.error) {
            console.error('Error adding document:', data.error);
            return;
        }
        
        // Redirect to the new document
        window.location.href = `/account/docs/${data.documentId}/${data._id}`;
    } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to add document';
        console.error('Error adding document:', errorMessage);
        
        if (_id === 'demo123') {
            console.log('Demo user cannot add documents');
            return;
        }
    }
};