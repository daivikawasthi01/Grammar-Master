import axios from 'axios';

export const HandleCheckTone = (
    text: string, 
    targetTone: string, 
    setToneSuggest: React.Dispatch<React.SetStateAction<string | undefined>>,
    setToneLoading: React.Dispatch<React.SetStateAction<boolean>>,
    _id: string
) => {
    if (!text?.trim()) {
        return;
    }

    setToneLoading(true);
    axios.post('/api/tone-check', {
        text: text,
        targetTone: targetTone,
        _id: _id
    }).then(({data}) => {
        setToneLoading(false);
        if (data.error) {
            console.error('Tone check error:', data.error);
        } else if (data.success) {
            setToneSuggest(data.success.text);
        }
    }).catch(err => {
        console.error('Tone check request failed:', err);
        setToneLoading(false);
    });
}; 