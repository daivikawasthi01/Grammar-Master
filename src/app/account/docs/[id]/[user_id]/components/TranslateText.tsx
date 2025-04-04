import React from 'react'
import styles from './correcttext.module.scss'
import CircularProgress from '@mui/material/CircularProgress';

interface TranslateTextProps {
    originalText: string;
    translatedText: string;
    language: string;
    setTranslateText: React.Dispatch<React.SetStateAction<string | undefined>>;
    setText: React.Dispatch<React.SetStateAction<string>>;
    loading?: boolean;
}

const TranslateText: React.FC<TranslateTextProps> = ({
    originalText,
    translatedText,
    language,
    setTranslateText,
    setText,
    loading
}) => {
    const handleAcceptTranslation = () => {
        setText(translatedText);
        setTranslateText(undefined);
    };

    const handleCloseTranslation = () => {
        setTranslateText(undefined);
    };

    if (loading) {
        return (
            <div className={styles.correct_text__container}>
                <div className={styles.correct_text__container__header}>
                    <p>Translating to {language}...</p>
                </div>
                <div className={styles.loading_container}>
                    <CircularProgress size={24} />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.correct_text__container}>
            <div className={styles.correct_text__container__header}>
                <svg className={styles.correct_text__container__header__icon__blue} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 640 512">
                    <path d="M0 128C0 92.7 28.7 64 64 64H256h48 16H576c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H320 304 256 64c-35.3 0-64-28.7-64-64V128zm320 0V384H576V128H320zm-144 64c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H208c-17.7 0-32 14.3-32 32z"/>
                </svg>
                <p>Translation to {language}</p>
            </div>
            <div 
                className={styles.translation_diff}
                dangerouslySetInnerHTML={{
                    __html: `<del>${originalText}</del><ins>${translatedText}</ins>`
                }}
            />
            <div className={styles.correct_text__container__footer}>
                <button 
                    className={styles.correct_text__container__btn__accept}
                    onClick={handleAcceptTranslation}
                >
                    Apply Translation
                </button>
                <button 
                    className={styles.correct_text__container__btn}
                    onClick={handleCloseTranslation}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default TranslateText;