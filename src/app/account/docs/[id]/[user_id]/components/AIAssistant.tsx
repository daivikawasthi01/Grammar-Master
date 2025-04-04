import React, { useState, useEffect } from 'react';
import styles from './aiassistant.module.scss';

interface AIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    selectedText: string;
    onAction: (action: string, text: string, customPrompt?: string) => void;
    writingGoals: {
        id: string;
        label: string;
        selected: string;
    }[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, selectedText, onAction, writingGoals }) => {
    const [prompt, setPrompt] = useState('');
    const [currentText, setCurrentText] = useState('');

    // Update currentText when selectedText changes or modal opens
    useEffect(() => {
        if (isOpen && selectedText) {
            setCurrentText(selectedText);
        }
    }, [isOpen, selectedText]);

    if (!isOpen) return null;

    const actions = [
        { id: 'improve', label: 'Improve it', icon: '✏️' },
        { id: 'shorten', label: 'Shorten it', icon: '✂️' },
        { id: 'professional', label: 'Make it Professional', icon: '👔' },
        { id: 'casual', label: 'Make it Casual', icon: '😊' },
        { id: 'friendly', label: 'Make it Friendly', icon: '🤝' },
        { id: 'formal', label: 'Make it Formal', icon: '📜' }
    ];

    const getGoalBasedPrompt = (actionId: string) => {
        const goals = writingGoals.map(g => `${g.label}: ${g.selected}`).join(', ');
        return `Modify the text to be ${actionId}, while maintaining these goals: ${goals}`;
    };

    const handleAction = (actionId: string) => {
        const enhancedPrompt = getGoalBasedPrompt(actionId);
        onAction(actionId, currentText, enhancedPrompt);
    };

    const handleCustomPrompt = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onAction('custom', currentText, prompt.trim());
            setPrompt('');
        }
    };

    return (
        <div 
            className={styles.ai_assistant_overlay}
            onMouseDown={(e) => e.preventDefault()} // Prevent text deselection
        >
            <div className={styles.ai_assistant} onClick={(e) => e.stopPropagation()}>
                <div className={styles.ai_assistant__header}>
                    <h3>AI Writing Assistant</h3>
                    <button onClick={onClose} className={styles.close_button}>×</button>
                </div>
                
                <div className={styles.ai_assistant__content}>
                    <div className={styles.selected_text}>
                        <p>Working with:</p>
                        <div className={styles.text_preview}>{currentText}</div>
                    </div>

                    <div className={styles.quick_actions}>
                        {actions.map(action => (
                            <button
                                key={action.id}
                                className={styles.action_button}
                                onClick={() => handleAction(action.id)}
                            >
                                <span className={styles.action_icon}>{action.icon}</span>
                                {action.label}
                            </button>
                        ))}
                    </div>

                    <form 
                        className={styles.custom_prompt}
                        onSubmit={handleCustomPrompt}
                    >
                        <input
                            type="text"
                            placeholder="Tell us what you want to do..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className={styles.prompt_input}
                            onMouseDown={(e) => e.stopPropagation()} // Prevent text deselection
                        />
                        <button 
                            type="submit"
                            className={styles.submit_button}
                        >
                            Submit
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;