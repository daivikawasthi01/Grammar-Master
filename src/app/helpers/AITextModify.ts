import axios from 'axios';

export const HandleAITextModify = async (
    text: string,
    action: string,
    customPrompt: string | undefined,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setModifiedText: React.Dispatch<React.SetStateAction<string | undefined>>,
    _id: string
) => {
    if (!text?.trim()) return;
    
    setLoading(true);
    try {
        const { data } = await axios.post('/api/ai-text-modify', {
            text: text.trim(),
            action,
            customPrompt,
            _id
        });

        if (data.error) {
            console.error('AI modification error:', data.error);
            setModifiedText(undefined);
        } else if (data.success?.text) {
            setModifiedText(data.success.text);
        }
    } catch (err) {
        console.error('AI modification failed:', err);
        setModifiedText(undefined);
    } finally {
        setLoading(false);
    }
}; 