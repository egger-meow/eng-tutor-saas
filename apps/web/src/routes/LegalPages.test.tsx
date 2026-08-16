import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PrivacyPage } from './PrivacyPage'
import { TermsPage } from './TermsPage'
import { legalConfig } from '../lib/config'

describe('Legal & Compliance Pages Rendering', () => {
  describe('PrivacyPage (/privacy)', () => {
    it('renders PDPA Article 8 mandatory disclosure items', () => {
      const html = renderToStaticMarkup(<PrivacyPage />)

      // Title & version
      expect(html).toContain('隱私權政策')
      expect(html).toContain(legalConfig.privacyVersion)

      // Operator identity
      expect(html).toContain(legalConfig.contactEmail)

      // Specified purposes & category mentions
      expect(html).toContain('法定告知事項（個資法第 8 條）')
      expect(html).toContain('蒐集之目的')
      expect(html).toContain('個人資料之類別')
      expect(html).toContain('家長／會員資料')
      expect(html).toContain('學生學習資料（未成年人）')

      // Data subject rights under PDPA Article 3
      expect(html).toContain('查詢或請求閱覽')
      expect(html).toContain('請求製給複製本')
      expect(html).toContain('請求補充或更正')
      expect(html).toContain('請求停止蒐集、處理或利用')
      expect(html).toContain('請求刪除')

      // Children data minimization guarantee
      expect(html).toContain('未成年人保護與資料最小化原則')
      expect(html).toContain('真實姓名')
      expect(html).toContain('身分證字號')
    })

    it('lists security protections and sub-processors', () => {
      const html = renderToStaticMarkup(<PrivacyPage />)

      expect(html).toContain('Supabase')
      expect(html).toContain('Paddle')
      expect(html).toContain('OpenAI')
      expect(html).toContain('Row Level Security')
    })
  })

  describe('TermsPage (/terms)', () => {
    it('renders statutory 3-day review period notice and version', () => {
      const html = renderToStaticMarkup(<TermsPage />)

      expect(html).toContain('服務條款')
      expect(html).toContain(legalConfig.termsVersion)
      expect(html).toContain('契約審閱權重要告知')
      expect(html).toContain('3 日之合理審閱期間')
    })

    it('renders distance contract and customized digital content cancellation rules', () => {
      const html = renderToStaticMarkup(<TermsPage />)

      expect(html).toContain('通訊交易與數位內容退訂說明')
      expect(html).toContain('非以有形媒介提供之客製數位內容')
    })

    it('renders refund and cancellation policy with balance return rules', () => {
      const html = renderToStaticMarkup(<TermsPage />)

      expect(html).toContain('隨時終止契約與退費機制')
      expect(html).toContain('隨時於會員後台「訂閱管理」頁面點選「取消續訂」')
    })

    it('renders original content IP ownership and license scope', () => {
      const html = renderToStaticMarkup(<TermsPage />)

      expect(html).toContain('智慧財產權與教材使用範圍')
      expect(html).toContain('非專屬、不可轉讓之個人家庭學習使用權')
      expect(html).toContain('嚴禁將教材用於補習班教學、商業轉售、大量重製、出租或公開散布')
    })

    it('renders governing law and court jurisdiction', () => {
      const html = renderToStaticMarkup(<TermsPage />)

      expect(html).toContain('準據法與管轄法院')
      expect(html).toContain('中華民國法律')
      expect(html).toContain('臺灣新竹地方法院')
    })
  })
})
