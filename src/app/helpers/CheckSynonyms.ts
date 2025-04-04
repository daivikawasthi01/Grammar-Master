import axios from 'axios';

export const HandleCheckWord = async (
    word: string,
    language: string,
    setWordSuggest: React.Dispatch<React.SetStateAction<string | undefined>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    _id: string
) => {
    if (!word?.trim()) return;
    
    setLoading(true);
    try {
        const { data } = await axios.post('/api/synonyms-check', {
            word: word.trim(),
            language,
            _id
        });

        if (data.error) {
            console.error('Synonym check error:', data.error);
            setWordSuggest(undefined);
        } else if (data.success?.words) {
            setWordSuggest(data.success.words);
        }
    } catch (err) {
        console.error('Synonym check failed:', err);
        setWordSuggest(undefined);
    } finally {
        setLoading(false);
    }
};

export const replaceSelectedWord = (
    element: HTMLElement,
    oldWord: string,
    newWord: string
): void => {
    if (!element || !oldWord || !newWord) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(element);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    
    const html = element.innerHTML;
    const escapedOldWord = oldWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedOldWord})`, 'gi');
    
    // Create a temporary div to handle HTML properly
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Replace text while preserving HTML structure
    const replaceInNode = (node: Node) => {
        if (node.nodeType === 3) { // Text node
            const text = node.textContent || '';
            const newText = text.replace(regex, newWord);
            if (text !== newText) {
                node.textContent = newText;
            }
        } else if (node.nodeType === 1) { // Element node
            Array.from(node.childNodes).forEach(replaceInNode);
        }
    };
    
    replaceInNode(tempDiv);
    element.innerHTML = tempDiv.innerHTML;
};