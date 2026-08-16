import { AppShell } from '../components/layout/AppShell'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FounderProfile } from '../components/public/FounderProfile'
import { PageTransition } from '../components/motion/PageTransition'
import { FadeInUp } from '../components/motion/FadeInUp'

export function AboutPage() {
  return (
    <AppShell header={<PublicHeader />}>
      <PageTransition>
        <FadeInUp>
          <FounderProfile />
        </FadeInUp>
      </PageTransition>
      <PublicFooter />
    </AppShell>
  )
}
