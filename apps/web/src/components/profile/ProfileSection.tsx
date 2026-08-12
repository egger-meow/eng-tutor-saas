import type { ReactNode } from 'react'

export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="profile-section"><h2>{title}</h2>{children}</section>
}

