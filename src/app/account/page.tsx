"use client";
import React from 'react'
import NewDoc from './components/NewDoc'
import useAuth from '@/app/hooks/useAuth'
import usePolling from '@/app/hooks/usePolling'
import Loading from '@/app/components/Loading'
import Sidebar from './components/Sidebar'
import Doc from './components/Doc'
import styles from './account.module.scss'
import axios from 'axios';

export default function AccountPage() {
  const { isLogged, error, isLoading } = useAuth()
  const { data, errorPoll, mutate } = usePolling()

  const HandleDeleteDocument = async (_id: string, documentId: string) => {
    try {
      await axios.delete(`/api/documents/${documentId}`, { data: { _id } });
      mutate();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  if (isLoading || !data) {
    return <Loading />
  }

  if (error || errorPoll) {
    return <div className={styles.error}>{error || errorPoll}</div>
  }

  if (!isLogged) {
    return <div className={styles.error}>You are not authorized</div>
  }

  return (
    <div className={styles.account}>
      <Sidebar email={data.email} />
      <div className={styles.account__content}>
        <input 
          type="text" 
          className={styles.account__content__search} 
          placeholder="Search documents..." 
        />
        <div className={styles.account__content__docs}>
          <NewDoc _id={data._id} />
          {data.documents?.map(doc => (
            <Doc
              key={doc._id}
              title={doc.title}
              status={doc.status}
              _id={data._id}
              documentId={doc._id}
              HandleDeleteDocument={HandleDeleteDocument}
              RestoreElement={null}
            />
          ))}
        </div>
      </div>
    </div>
  )
}



 

 