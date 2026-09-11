import './AssessmentSellingSection.css'

export function AssessmentSellingSection() {
  return (
    <section className="public-section assessment-selling-section" id="assessment" aria-labelledby="assessment-section-title">
      <div className="section-heading assessment-selling-heading">
        <p className="overline">選用程度診斷</p>
        <h2 id="assessment-section-title">不只問程度，讓孩子直接做給系統看。</h2>
        <p>
          註冊只要 2 分鐘完成基礎設定；登入後可隨時讓孩子進行 15 分鐘程度診斷，亦可直接開始學習，系統皆能自動循序調整。
        </p>
      </div>

      <div className="assessment-selling-layout">
        <div className="assessment-features-list">
          <div className="assessment-feature-card">
            <span className="assessment-feature-num">01</span>
            <div className="assessment-feature-text">
              <h3>溫和自適應出題</h3>
              <p>題數隨作答情況彈性調整，遇到不確定可直接跳過，不倒數計時、不給考試壓力。</p>
            </div>
          </div>

          <div className="assessment-feature-card">
            <span className="assessment-feature-num">02</span>
            <div className="assessment-feature-text">
              <h3>三大領域 13 項指標</h3>
              <p>涵蓋單字、文法與閱讀理解的真實輪廓，找出卡住的關鍵盲點。</p>
            </div>
          </div>

          <div className="assessment-feature-card">
            <span className="assessment-feature-num">03</span>
            <div className="assessment-feature-text">
              <h3>進度隨存，即時投影</h3>
              <p>作答中途可隨時暫停與接續；完成後立即投影至學習記憶，不需人工等待批改。</p>
            </div>
          </div>
        </div>

        <div className="assessment-demo-card" aria-label="程度診斷結果展示範例">
          <div className="assessment-demo-header">
            <span className="assessment-demo-badge">診斷結果範例</span>
            <h3>國一程度診斷能力輪廓</h3>
            <p className="assessment-demo-narrative">
              「核心單字掌握穩定，篇章明確細節理解良好；動詞時態與推論理解正在建立中，建議作為後續每週練習重點。」
            </p>
          </div>

          <div className="assessment-demo-domains">
            <div className="assessment-demo-domain-row">
              <div className="assessment-demo-domain-info">
                <span className="assessment-demo-domain-name">單字領域</span>
                <span className="assessment-demo-domain-skills">核心單字・情境字義</span>
              </div>
              <span className="assessment-demo-badge-status status-secure">掌握穩定</span>
            </div>

            <div className="assessment-demo-domain-row">
              <div className="assessment-demo-domain-info">
                <span className="assessment-demo-domain-name">文法領域</span>
                <span className="assessment-demo-domain-skills">基本句型・時態一致</span>
              </div>
              <span className="assessment-demo-badge-status status-growing">正在建立</span>
            </div>

            <div className="assessment-demo-domain-row">
              <div className="assessment-demo-domain-info">
                <span className="assessment-demo-domain-name">閱讀領域</span>
                <span className="assessment-demo-domain-skills">主旨理解・資訊推論</span>
              </div>
              <span className="assessment-demo-badge-status status-growing">正在建立</span>
            </div>
          </div>

          <div className="assessment-demo-footer">
            <p>
              💡 診斷完全選用，登入後即可進行；完成後 90 天可選用重新診斷，平時系統依每週作答表現自動調整。
            </p>
            <a className="button button-sm assessment-demo-cta" href="#onboarding">
              免費開始（登入後即可選用診斷）
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
