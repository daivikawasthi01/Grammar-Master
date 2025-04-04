import React from 'react';
import styles from './bestversion.module.scss';

interface BestVersionProps {
  originalText: string;
  suggestions: Array<{
    text: string;
    improvement: string;
    score: number;
  }>;
  onAccept: (text: string) => void;
  onDismiss: () => void;
}

const BestVersion: React.FC<BestVersionProps> = ({
  originalText,
  suggestions,
  onAccept,
  onDismiss
}) => {
  return (
    <div className={styles.best_version}>
      <div className={styles.best_version__header}>
        <h4>Best Version Suggestions</h4>
        <p className={styles.best_version__subheader}>
          Select the version that best fits your needs
        </p>
      </div>

      <div className={styles.best_version__original}>
        <p className={styles.best_version__label}>Original Text:</p>
        <div className={styles.best_version__text}>{originalText}</div>
      </div>

      <div className={styles.best_version__suggestions}>
        {suggestions.map((suggestion, index) => (
          <div key={index} className={styles.suggestion_card}>
            <div className={styles.suggestion_header}>
              <span className={styles.suggestion_score}>
                Score: {suggestion.score}%
              </span>
              <span className={styles.suggestion_improvement}>
                {suggestion.improvement}
              </span>
            </div>
            <div className={styles.suggestion_text}>
              {suggestion.text}
            </div>
            <div className={styles.suggestion_actions}>
              <button 
                onClick={() => onAccept(suggestion.text)}
                className={styles.accept_button}
              >
                Use this version
              </button>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={onDismiss}
        className={styles.dismiss_button}
      >
        Keep Original
      </button>
    </div>
  );
};

export default BestVersion; 