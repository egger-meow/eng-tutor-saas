export type LegalConfig = {
  termsVersion: string
  termsPublishedAt: string
  termsEffectiveAt: string
  privacyVersion: string
  reviewPeriodDays: number
  contactEmail: string
  companyName: string
  representative: string
  taxId: string
  companyAddress: string
  allowAutoRenewal: boolean
  isLegalEntityConfigured: boolean
}

export const legalConfig: LegalConfig = {
  termsVersion: '2026-08-26-v2',
  termsPublishedAt: '2026-08-26',
  termsEffectiveAt: '2026-08-29',
  privacyVersion: '2026-08-16-v1',
  reviewPeriodDays: 3,
  contactEmail: import.meta.env.VITE_LEGAL_CONTACT_EMAIL || 'jjmow.cs15@nycu.edu.tw',
  companyName: import.meta.env.VITE_LEGAL_COMPANY_NAME || 'jjmow (侯均頲)',
  representative: import.meta.env.VITE_LEGAL_REPRESENTATIVE || 'jjmow (侯均頲)',
  taxId: import.meta.env.VITE_LEGAL_TAX_ID || '依法申報 / 辦理中',
  companyAddress: import.meta.env.VITE_LEGAL_COMPANY_ADDRESS || '台灣新竹市',
  // Recurring subscription feature switch (supports standard SaaS recurring billing via Paddle):
  allowAutoRenewal: import.meta.env.VITE_ALLOW_AUTO_RENEWAL !== 'false',
  isLegalEntityConfigured: Boolean(
    import.meta.env.VITE_LEGAL_COMPANY_NAME && import.meta.env.VITE_LEGAL_REPRESENTATIVE
  ),
}

export function isCurrentTermsEffective(now: Date = new Date()): boolean {
  return now.getTime() >= new Date('2026-08-29T00:00:00+08:00').getTime()
}
