import React from 'react'
import styles from '../account.module.scss'
import Link from 'next/link'

interface DocProps {
    title: string,
    status: string,
    _id: string,
    documentId: string
    HandleDeleteDocument : (_id: string, documentId: string) => void
    RestoreElement: any
}

const Doc : React.FC<DocProps> = ({title,status,_id,documentId,HandleDeleteDocument,RestoreElement}) => {
  return (
    <div className={styles.doc}>
      <Link href={`/account/docs/${documentId}/${_id}`}>
        <div className={styles.doc__content}>
          <h3>{title}</h3>
          <p>Status: {status}</p>
        </div>
      </Link>
      {RestoreElement ? (
        <RestoreElement _id={_id} documentId={documentId} />
      ) : (
        <button onClick={() => HandleDeleteDocument(_id, documentId)}>Delete</button>
      )}
    </div>
  )
}

export default Doc