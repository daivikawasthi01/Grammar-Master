import React,{useRef,useEffect} from 'react'
import styles from './correcttext.module.scss'
import CircularProgress from '@mui/material/CircularProgress';

interface CorrectTextProps {
    text: string
    setMistakeText: React.Dispatch<React.SetStateAction<undefined | string | Element>>
    setText: React.Dispatch<React.SetStateAction<undefined | string >>
    mistakeText: string
    setCorrect:React.Dispatch<React.SetStateAction<boolean>>
}

const CorrectText:React.FC<CorrectTextProps> = ({text,setText,setMistakeText,mistakeText,setCorrect}) => {
    const refCorrectText=useRef<HTMLDivElement>(null)
    
    useEffect(()=>{
        if (refCorrectText.current) {
            refCorrectText.current.innerHTML = text
        }
    },[text])

    const handleCorrectTextAccept=():void=>{
        if (text) {
            const cleanText = text.replace(/<del>.*?<\/del>/g, '')
                                .replace(/<ins>(.*?)<\/ins>/g, '$1')
            setText(cleanText)
            setCorrect(true)
        }
    }

    const handleCorrectTextDismiss=():void=>{
        if (typeof mistakeText === 'string') {
            setText(mistakeText)
            setMistakeText(undefined)
            setCorrect(true)
        }
    }

    return (
        <div className={styles.correct_text__container}>
            <div className={styles.correct_text__container__header}>
                <svg className={styles.correct_text__container__header__icon__green} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
                    <path d="M470.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L192 338.7 425.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
                </svg>
                <p>Grammar Check Results</p>
            </div>
            <div ref={refCorrectText} className={styles.translation_diff}></div>
            <div className={styles.correct_text__container__footer}>
                <button className={styles.correct_text__container__btn__accept} onClick={handleCorrectTextAccept}>Accept Changes</button>
                <button className={styles.correct_text__container__btn} onClick={handleCorrectTextDismiss}>Keep Original</button>
            </div>
        </div>
    )
}

export default CorrectText