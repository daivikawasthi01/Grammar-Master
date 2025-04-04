import React, { useRef, useEffect } from 'react'
import styles from './correcttext.module.scss'

interface ToneCorrectionProps {
    text: string
    setText: (text: string) => void
    setMistakeText: React.Dispatch<React.SetStateAction<string | undefined>>
    mistakeText: string
    setToneCorrection: React.Dispatch<React.SetStateAction<boolean>>
    textRef: React.RefObject<HTMLDivElement>
}

const ToneCorrection: React.FC<ToneCorrectionProps> = ({
    text,
    setText,
    setMistakeText,
    mistakeText,
    setToneCorrection,
    textRef
}) => {
    const refCorrectText = useRef<any>(null)
    
    useEffect(() => {
        if (refCorrectText.current) {
            refCorrectText.current.innerHTML = text
        }
    }, [text])

    const handleToneAccept = (): void => {
        if (text) {
            setText(text);
            setToneCorrection(true);
        }
    }

    const handleToneDismiss = (): void => {
        setToneCorrection(true);
    }

    return (
        <div className={styles.correct_text__container}>
            <div className={styles.correct_text__container__header}>
                <svg className={styles.correct_text__container__header__icon__blue} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
                    <path d="M278.5 215.6L23 471c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l255.5-255.5L278.5 215.6zm230.6-230.6C530.4 4.3 554.7 0 579.8 0c48.5 0 88.2 39.7 88.2 88.2 0 25.1-4.3 49.4-14.9 70.6C634.8 198.6 580.5 235.7 544 256c-35.8-20.3-90.1-57.4-108.5-97.2-10.6-21.2-14.9-45.5-14.9-70.6C420.6 39.7 460.3 0 508.8 0c25.1 0 49.4 4.3 70.6 14.9 8.6 4.3 16.6 9.4 23.8 15.1 7.2-5.7 15.2-10.8 23.8-15.1z"/>
                </svg>
                <p>Tone Adjustment Results</p>
            </div>
            <div className={styles.correct_text__content}>
                <div>Original Text:</div>
                <div className={styles.correct_text__original}>{mistakeText}</div>
                <div>Suggested Text:</div>
                <div ref={refCorrectText} className={styles.correct_text__suggestion}></div>
            </div>
            <div className={styles.correct_text__container__footer}>
                <button className={styles.correct_text__container__btn__accept} onClick={handleToneAccept}>Accept Changes</button>
                <button className={styles.correct_text__container__btn} onClick={handleToneDismiss}>Keep Original</button>
            </div>
        </div>
    )
}

export default ToneCorrection