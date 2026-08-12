import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FounderProfile } from '../components/public/FounderProfile'

export function AboutPage() { return <AppShell header={<PublicHeader />}><FounderProfile /></AppShell> }

