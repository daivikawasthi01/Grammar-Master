import React from 'react'
import styles from './correcttext.module.scss'

interface SynonymsWordsProps {
    text: string;
    setWordSuggest: React.Dispatch<React.SetStateAction<string | undefined>>;
    originalWord: string;
    onReplace: (newWord: string) => void;
}

const SynonymsWords: React.FC<SynonymsWordsProps> = ({
    text,
    setWordSuggest,
    originalWord,
    onReplace
}) => {
    const handleCloseSynonyms = () => {
        setWordSuggest(undefined);
    };

    const handleReplace = (synonym: string) => {
        onReplace(synonym);
        setWordSuggest(undefined); // Close the synonyms panel after replacing
    };

    const synonyms = text.split(',')
        .map(s => s.trim())
        .filter(s => s && s.toLowerCase() !== originalWord.toLowerCase()); // Case insensitive comparison

    if (!synonyms.length) {
        return (
            <div className={styles.correct_text__container}>
                <div className={styles.correct_text__container__header}>
                    <p>No synonyms found for "{originalWord}"</p>
                </div>
                <div className={styles.correct_text__container__footer}>
                    <button className={styles.correct_text__container__btn} onClick={handleCloseSynonyms}>
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.correct_text__container}>
            <div className={styles.correct_text__container__header}>
                <svg className={styles.correct_text__container__header__icon__blue} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
                    <path d="M0 192c0-35.3 28.7-64 64-64h1.6C73 91.5 105.3 64 144 64c35.3 0 64 28.7 64 64s-28.7 64-64 64H64c-35.3 0-64-28.7-64-64zm384 0c0-35.3 28.7-64 64-64h1.6c7.4-36.5 39.7-64 78.4-64 35.3 0 64 28.7 64 64s-28.7 64-64 64h-80c-35.3 0-64-28.7-64-64zM192 288c0-35.3 28.7-64 64-64h1.6c7.4-36.5 39.7-64 78.4-64 35.3 0 64 28.7 64 64s-28.7 64-64 64h-80c-35.3 0-64-28.7-64-64z"/>
                </svg>
                <p>Synonyms for "{originalWord}"</p>
            </div>
            <div className={styles.synonyms_list}>
                {synonyms.map((synonym, index) => (
                    <button 
                        key={index}
                        className={styles.synonym_button}
                        onClick={() => handleReplace(synonym)}
                    >
                        {synonym}
                    </button>
                ))}
            </div>
            <div className={styles.correct_text__container__footer}>
                <button className={styles.correct_text__container__btn} onClick={handleCloseSynonyms}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default SynonymsWords;