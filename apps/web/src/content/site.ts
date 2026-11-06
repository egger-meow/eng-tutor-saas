import { billingPlans } from '../lib/billing-plans'

export const productConfig = {
  name: '紙屬英文',
  standardPrice: billingPlans.monthly.priceTwd,
  annualPrice: billingPlans.annual.priceTwd,
  foundingPrice: 349,
  foundingLimit: 30,
  capacity: 100,
} as const

export const founderContent = {
  isPublished: true,
  name: '侯均頲',
  displayName: 'JJmow 老師',
  shortBio: '紙屬英文創作者・一對一家教',
  fullBio: '我有國小英文一對一與國中數學教學經驗，大學完成管理科學與資訊工程雙主修，目前就讀陽明交通大學數據科學與工程研究所碩士班。',
  philosophy: '我希望孩子先自己閱讀、圈出不懂的地方、完成作答，再把科技用在解釋與延伸練習，而不是代替思考。',
  website: 'https://me.jjmowlab.com/',
  email: '',
  portraitPath: '/founder/jjmow-brand.png',
  scoreEvidencePath: '',
  scoreSummary: '',
} as const
