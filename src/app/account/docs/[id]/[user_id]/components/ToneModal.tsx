import React from 'react';
import styles from './tonemodal.module.scss';

interface ToneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onToneSelect: (tone: string) => void;
}

const TONE_OPTIONS = [
    'Professional',
    'Casual',
    'Formal',
    'Friendly',
    'Confident',
    'Empathetic'
];

const ToneModal: React.FC<ToneModalProps> = ({ isOpen, onClose, onToneSelect }) => {
    if (!isOpen) return null;

    return (
        <div className={styles.tone_modal_overlay}>
            <div className={styles.tone_modal}>
                <div className={styles.tone_modal__header}>
                    <h3>Select Tone</h3>
                    <button onClick={onClose}>×</button>
                </div>
                <div className={styles.tone_modal__content}>
                    {TONE_OPTIONS.map((tone) => (
                        <button
                            key={tone}
                            className={styles.tone_button}
                            onClick={() => onToneSelect(tone)}
                        >
                            {tone}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ToneModal; 