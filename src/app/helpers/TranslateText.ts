import axios from 'axios';

export const HandleTranslateText = async (
    text: string,
    language: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setText: React.Dispatch<React.SetStateAction<string>>,
    setTranslateText: React.Dispatch<React.SetStateAction<string | undefined>>,
    _id: string
) => {
    if (!text?.trim()) return;

    setLoading(true);
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const textContent = tempDiv.textContent || tempDiv.innerText;

        const { data } = await axios.post('/api/text-translate', {
            text: textContent.trim(),
            language,
            _id
        });

        if (data.error) {
            console.error('Translation error:', data.error);
            setTranslateText(undefined);
        } else if (data.success?.text) {
            const translatedNodes = Array.from(tempDiv.childNodes).map(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    return data.success.text;
                }
                return node.outerHTML;
            });
            setTranslateText(translatedNodes.join(''));
        }
    } catch (err) {
        console.error('Translation failed:', err);
        setTranslateText(undefined);
    } finally {
        setLoading(false);
    }
};