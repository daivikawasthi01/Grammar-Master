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
    if (!suggestions || suggestions.length === 0) {
      return text;
    }
    const cleanText = stripHtml(text);

    // Resolve valid start and end indices for suggestions
    const validSuggestions = suggestions
      .map((suggestion) => {
        const textToReplace = suggestion.text;
        const startIndex =
          typeof suggestion.start === "number" && suggestion.start >= 0
            ? suggestion.start
            : cleanText.indexOf(textToReplace);
        const endIndex =
          typeof suggestion.end === "number" && suggestion.end > startIndex
            ? suggestion.end
            : startIndex + (textToReplace ? textToReplace.length : 0);

        return {
          ...suggestion,
          textToReplace,
          startIndex,
          endIndex,
        };
      })
      .filter(
        (s) =>
          s.textToReplace &&
          s.startIndex !== -1 &&
          cleanText.slice(s.startIndex, s.endIndex) === s.textToReplace
      )
      // Sort descending by offset so inserting spans from right-to-left preserves earlier offsets
      .sort((a, b) => b.startIndex - a.startIndex);

    let processed = cleanText;
    for (const s of validSuggestions) {
      const span = `<span class="error-${s.type}">${s.textToReplace}</span>`;
      processed =
        processed.slice(0, s.startIndex) +
        span +
        processed.slice(s.endIndex);
    }

    return processed;
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