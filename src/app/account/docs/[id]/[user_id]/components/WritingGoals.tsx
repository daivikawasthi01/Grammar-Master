import React from 'react';
import styles from './writinggoals.module.scss';

interface Goal {
  id: string;
  label: string;
  options: string[];
  selected: string;
}

interface WritingGoalsProps {
  goals: Goal[];
  onGoalChange: (goalId: string, value: string) => void;
}

const WritingGoals: React.FC<WritingGoalsProps> = ({ goals, onGoalChange }) => {
  return (
    <div className={styles.goals_panel}>
      <h4>Writing Goals</h4>
      
      {goals.map(goal => (
        <div key={goal.id} className={styles.goal_item}>
          <label>{goal.label}</label>
          <select 
            value={goal.selected}
            onChange={(e) => onGoalChange(goal.id, e.target.value)}
            className={styles.goal_select}
          >
            {goal.options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};

export default WritingGoals; 