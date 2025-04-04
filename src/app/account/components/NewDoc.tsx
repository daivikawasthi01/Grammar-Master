'use client';

import React from 'react'
import styles from '../account.module.scss'
import { HandleAddDocument } from '@/app/helpers/AddDocument'

interface NewDocProps {
    _id: string
}

const NewDoc: React.FC<NewDocProps> = ({_id}) => {
  return (
    <div className={styles.newdoc}>
      <div className={styles.newdoc__up} onClick={()=>HandleAddDocument(_id)}>
        <svg data-testid="doc-logo" className={styles.newdoc__icon} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512">
          <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z"/>
        </svg>
        <p className={styles.newdoc__text}>New</p>
      </div>
      <div className={styles.newdoc__down}>
        <svg data-testid="upload-logo" className={styles.newdoc__icon__upload} xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512">
          <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM216 408c0 13.3-10.7 24-24 24s-24-10.7-24-24V305.9l-31 31c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l72-72c9.4-9.4 24.6-9.4 33.9 0l72 72c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-31-31V408z"/>
        </svg>
        <p className={styles.newdoc__text__upload}>Upload</p>
      </div>
    </div>
  )
}

export default NewDoc