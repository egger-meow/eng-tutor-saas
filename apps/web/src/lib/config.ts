export type LegalConfig = {
  termsVersion: string
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
  termsVersion: '2026-08-16-v1',
  privacyVersion: '2026-08-16-v1',
  reviewPeriodDays: 3,
  contactEmail: import.meta.env.VITE_LEGAL_CONTACT_EMAIL || 'support@paperenglish.tw',
  // Placeholders requiring official business registration details before public launch:
  companyName: import.meta.env.VITE_LEGAL_COMPANY_NAME || 'Egg & Cat Co. (紙屬英文)',
  representative: import.meta.env.VITE_LEGAL_REPRESENTATIVE || 'Jonathan Lin',
  taxId: import.meta.env.VITE_LEGAL_TAX_ID || '辦理中 / 依法揭露',
  companyAddress: import.meta.env.VITE_LEGAL_COMPANY_ADDRESS || '台灣台北市',
  // Recurring subscription feature switch (supports standard SaaS recurring billing via Paddle):
  allowAutoRenewal: import.meta.env.VITE_ALLOW_AUTO_RENEWAL !== 'false',
  isLegalEntityConfigured: Boolean(
    import.meta.env.VITE_LEGAL_COMPANY_NAME && import.meta.env.VITE_LEGAL_REPRESENTATIVE
  ),
}
