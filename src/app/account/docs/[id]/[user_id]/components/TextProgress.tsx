import React from 'react';
import styles from './textprogress.module.scss';
import LinearProgress from "@mui/material/LinearProgress";

interface TextProgressProps {
  correctness: number;
  clarity: number;
  engagement: number;
  delivery: number;
  suggestionCount?: number;
}

const TextProgress: React.FC<TextProgressProps> = ({
  correctness,
  clarity,
  engagement, 
  delivery,
  suggestionCount = 0
}) => {
  return (
    <div className={styles.progress_panel}>
      <div className={styles.header}>
        <h4>Review suggestions</h4>
        {suggestionCount > 0 && (
          <span className={styles.suggestion_count}>{suggestionCount}</span>
        )}
      </div>
      <div className={styles.metrics_grid}>
        <div className={styles.metric_item}>
          <LinearProgress 
            variant="determinate" 
            value={correctness}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: '#fce8e8',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#e45f5f',
                borderRadius: 2,
              },
            }}
          />
          <div className={styles.metric_label}>Correctness</div>
        </div>

        <div className={styles.metric_item}>
          <LinearProgress
            variant="determinate"
            value={clarity}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: '#e8f0fc',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#3b82f6',
                borderRadius: 2,
              },
            }}
          />
          <div className={styles.metric_label}>Clarity</div>
        </div>

        <div className={styles.metric_item}>
          <LinearProgress
            variant="determinate"
            value={engagement}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: '#f3e8fc',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#8d5cf6',
                borderRadius: 2,
              },
            }}
          />
          <div className={styles.metric_label}>Engagement</div>
        </div>

        <div className={styles.metric_item}>
          <LinearProgress
            variant="determinate"
            value={delivery}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: '#fcf5e8',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#f5ad0e',
                borderRadius: 2,
              },
            }}
          />
          <div className={styles.metric_label}>Delivery</div>
        </div>
      </div>
    </div>
  );
};

export default TextProgress; 