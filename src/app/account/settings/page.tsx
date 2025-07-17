"use client"

import React, { useState } from 'react'
import useAuth from '@/app/hooks/useAuth'
import usePolling from '@/app/hooks/usePolling'
import Loading from '@/app/components/Loading'
import Sidebar from '../components/Sidebar'
import styles from './settings.module.scss'
import SettingsModal from './components/SettingsModal'
import { SettingsList } from './components/lists/setting'
import LinearProgress from '@mui/material/LinearProgress'

// ✅ Add the type for the user data
interface UserData {
  name: string
  email: string
  password: string
  plan: "free" | "pro" | "buisness"
  prompts: number
}

const Settings: React.FC = () => {
  const { isLogged, error, isLoading } = useAuth()
  const { data } = usePolling() as { data: UserData | null }
  const [modal, setModal] = useState('')
  const [isModal, setIsModal] = useState(false)

  if (error) {
    return <div>{error}</div>
  }

  if (isLoading || !data) {
    return <Loading />
  }

  if (isLogged && data) {
    const totalPrompts =
      data.plan === 'buisness'
        ? 20000
        : data.plan === 'free'
        ? 1000
        : 10000

    const progressPercent = Math.floor((data.prompts / totalPrompts) * 100)

    return (
      <div className={styles.settings}>
        <Sidebar email={data?.email} />

        {isModal &&
          SettingsList.filter((content) => content.title === modal).map((modalItem) => (
            <SettingsModal
              key={modalItem.title}
              email={data.email}
              setIsModal={setIsModal}
              data={modalItem}
            />
          ))}

        <div className={styles.settings__profile}>
          <h2 className={styles.settings__profile__title}>Account Settings</h2>
          <hr />
          <h5>Profile</h5>

          <div className={styles.settings__profile__section}>
            <p className={styles.settings__profile__section__title}>Name</p>
            <p>
              {data.name}
              <span
                onClick={() => {
                  setModal('Update Name')
                  setIsModal(true)
                }}
                className={styles.settings__profile__section__btn}
              >
                Update
              </span>
            </p>
          </div>

          <div className={styles.settings__profile__section}>
            <p className={styles.settings__profile__section__title}>Email</p>
            <p>
              {data.email}
              <span
                onClick={() => {
                  setModal('Update Email')
                  setIsModal(true)
                }}
                className={styles.settings__profile__section__btn}
              >
                Update
              </span>
            </p>
          </div>

          <div className={styles.settings__profile__section}>
            <p className={styles.settings__profile__section__title}>Password</p>
            <p>
              {data.password}
              <span
                onClick={() => {
                  setModal('Update Password')
                  setIsModal(true)
                }}
                className={styles.settings__profile__section__btn}
              >
                Update
              </span>
            </p>
          </div>

          <div className={styles.settings__profile__section}>
            <p className={styles.settings__profile__section__title}>Ai Prompts</p>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              style={{ width: '50%', display: 'inline-block', height: '8px' }}
            />
            <p className={styles.settings__profile__section__prompts}>
              <span style={{ fontWeight: 'bold' }}>{data.prompts}</span> / {totalPrompts}
            </p>
          </div>

          <hr />

          <div className={styles.settings__profile__section}>
            <p className={styles.settings__profile__section__delete__btn}>Delete Account</p>
            <p style={{ fontSize: '0.8rem' }}>
              This account will no longer be available, and all your saved data will be permanently deleted.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default Settings
