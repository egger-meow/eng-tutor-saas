import { billingPlans } from '../lib/billing-plans'

export const productConfig = {
  name: '紙屬英文',
  standardPrice: billingPlans.monthly.priceTwd,
  annualPrice: billingPlans.annual.priceTwd,
  foundingPrice: 299,
  foundingLimit: 30,
  capacity: 100,
} as const

export const founderContent = {
  isPublished: false,
  name: '',
  shortBio: '',
  fullBio: '',
  philosophy: '我希望孩子先自己閱讀、圈出不懂的地方、完成作答，再把科技用在解釋與延伸練習，而不是代替思考。',
  website: '',
  email: '',
  portraitPath: '',
  scoreEvidencePath: '',
  scoreSummary: '',
} as const
