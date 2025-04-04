import axios from 'axios';

interface SaveResponse {
  status: string;
  version?: number;
  error?: string;
}

export const HandleSaveDocument = async (
  _id: string, 
  documentId: string, 
  title: string, 
  text: string
): Promise<boolean> => {
    // Validate inputs
    if (!_id || !documentId) {
        console.error('Missing required fields for save');
        return false;
    }

    try {
        const { data } = await axios.post<SaveResponse>('/api/save-document', {
            _id,
            documentId,
            title: title.trim() || 'Untitled Document',
            text: text || '',
            version: Date.now() // Simple versioning
        });

        if (data.error) {
            console.error('Save error:', data.error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Save document error:', err);
        return false;
    }
}