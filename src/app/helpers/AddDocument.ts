import axios from 'axios';

interface AddDocumentResponse {
  documentId: string;
  _id: string;
  error?: string;
}

export const HandleAddDocument = async (userId?: string): Promise<string | null> => {
  try {
    const { data } = await axios.post<AddDocumentResponse>('/api/add-document', {
      title: 'Untitled Document',
      text: '',
    });

    if (data && data.documentId) {
      const redirectUrl = `/account/docs/${data.documentId}/${data._id || userId}`;
      window.location.href = redirectUrl;
      return data.documentId;
    }
    return null;
  } catch (error: any) {
    console.error('Failed to create new document:', error);
    alert(error?.response?.data?.error || 'Failed to create new document. Please try again.');
    return null;
  }
};