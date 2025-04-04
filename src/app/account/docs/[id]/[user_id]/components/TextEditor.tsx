import React, { useCallback } from 'react';
import ContentEditable from 'react-contenteditable';
import styles from './texteditor.module.scss';

const stripHtml = (html: string) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

interface TextEditorProps {
  text: string;
  onChange: (text: string) => void;
  onSelect: (selection: string) => void;
  suggestions: Array<{
    type: 'grammar' | 'clarity' | 'engagement' | 'delivery';
    start: number;
    end: number;
    suggestion: string;
    text: string;
    explanation: string;
  }>;
}

const TextEditor: React.FC<TextEditorProps> = ({
  text,
  onChange,
  onSelect,
  suggestions
}) => {
  const handleChange = (evt: any) => {
    const newText = evt.target.value;
    onChange(newText);
  };

  const handleSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const cleanSelection = selection.toString().replace(/<[^>]*>/g, '');
      onSelect(cleanSelection);
    }
  };

  const processText = useCallback((text: string) => {
    let processedText = text;
    const cleanText = stripHtml(text);
    
    suggestions.forEach(suggestion => {
      const textToReplace = suggestion.text;
      if (textToReplace && cleanText.includes(textToReplace)) {
        const span = `<span class="error-${suggestion.type}">${textToReplace}</span>`;
        const startIndex = cleanText.indexOf(textToReplace);
        if (startIndex !== -1) {
          processedText = cleanText.slice(0, startIndex) + span + cleanText.slice(startIndex + textToReplace.length);
        }
      }
    });
    
    return processedText;
  }, [suggestions]);

  return (
    <div className={styles.editor_container}>
      <ContentEditable
        html={processText(text)}
        onChange={handleChange}
        onSelect={handleSelect}
        className={styles.editor_content}
      />
    </div>
  );
};

export default TextEditor; 