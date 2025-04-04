import React from 'react';
import styles from './suggestionpanel.module.scss';

interface Suggestion {
  type: 'grammar' | 'clarity' | 'engagement' | 'delivery';
  text: string;
  suggestion: string;
  explanation: string;
  start: number;
  end: number;
}

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  onApply: (text: string) => void;
  onDismiss: (index: number) => void;
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  suggestions,
  onApply,
  onDismiss
}) => {
  const typeIcons = {
    grammar: '✍️',
    clarity: '💡',
    engagement: '🎯',
    delivery: '📢'
  };

  return (
    <div className={styles.suggestions_panel}>
      <h4>Suggestions</h4>
      
      {(!suggestions || suggestions.length === 0) ? (
        <div className={styles.no_suggestions}>
          <p>No suggestions at the moment</p>
          <small>Start writing to get suggestions for improvement</small>
        </div>
      ) : (
        <div className={styles.suggestions_list}>
          {suggestions.map((suggestion, index) => (
            <div key={index} className={styles.suggestion_card}>
              <div className={styles.suggestion_header}>
                <span className={styles.suggestion_type}>
                  {typeIcons[suggestion.type]} {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                </span>
              </div>
              
              <div className={styles.suggestion_content}>
                <div className={styles.original_text}>
                  <span className={styles.label}>Original:</span>
                  <span className={styles.text}>{suggestion.text}</span>
                </div>
                
                <div className={styles.suggested_text}>
                  <span className={styles.label}>Suggestion:</span>
                  <span className={styles.text}>{suggestion.suggestion}</span>
                </div>
                
                <p className={styles.explanation}>{suggestion.explanation}</p>
              </div>
              
              <div className={styles.suggestion_actions}>
                <button 
                  onClick={() => onApply(suggestion.suggestion)}
                  className={styles.apply_button}
                >
                  Apply
                </button>
                <button 
                  onClick={() => onDismiss(index)}
                  className={styles.dismiss_button}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestionPanel; 