import React, { useState } from 'react'
import type { ParentFeedbackIntelligence as ParentFeedbackIntelligenceType } from '../../client/types.js'

interface ParentFeedbackIntelligenceProps {
  data: ParentFeedbackIntelligenceType | null
  onDrillDownTimeline: (childId: string, week?: string) => void
}

export const ParentFeedbackIntelligenceView: React.FC<ParentFeedbackIntelligenceProps> = ({
  data,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [weakAreaFilter, setWeakAreaFilter] = useState<string>('all')

  if (!data) return <div>讀取中...</div>

  const {
    totalSubmissions,
    difficultyDistribution,
    completionRateDistribution,
    weakAreaDistribution,
    topicClusters,
    childVoiceQuotes,
    recentFeedbackList,
  } = data

  const filteredFeedback = recentFeedbackList.filter((fb) => {
    if (difficultyFilter !== 'all' && fb.difficulty !== difficultyFilter) return false
    if (weakAreaFilter !== 'all' && fb.weakArea !== weakAreaFilter) return false
    if (searchTerm) {
      const matchText = [
        fb.childComments,
        fb.parentComments,
        fb.mistakesText,
        fb.schoolProgressUpdate,
        fb.interestUpdate,
      ].filter(Boolean).join(' ')
      return matchText.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  return (
    <div>
      {/* Top Level Summary Cards */}
      <div className="kpi-grid">
        <div className="cockpit-card featured">
          <div className="card-header-sm">
            <span>累計家長反饋份數</span>
            <span className="status-pill completed">回饋</span>
          </div>
          <div className="kpi-value">{totalSubmissions}</div>
          <div className="kpi-subtext">主動完成率 100%: {completionRateDistribution.rate100} 份</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>難度剛剛好比例 (Good)</span>
            <span className="status-pill healthy">Target 70%+</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-emerald)' }}>
            {difficultyDistribution.good.percentage}%
          </div>
          <div className="kpi-subtext">偏難: {difficultyDistribution.tooHard.percentage}% | 偏易: {difficultyDistribution.tooEasy.percentage}%</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>最常見學習卡點 (Top Weak Area)</span>
            <span className="status-pill warning">Focus</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '18px' }}>
            {weakAreaDistribution[0]?.label || '無'}
          </div>
          <div className="kpi-subtext">佔比: {weakAreaDistribution[0]?.percentage}% ({weakAreaDistribution[0]?.count} 份)</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>主要高頻反饋主題</span>
            <span className="status-pill pending">Theme</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '18px', color: '#93c5fd' }}>
            {topicClusters[0]?.topic.split(' ')[0] || '無'}
          </div>
          <div className="kpi-subtext">出現頻率: {topicClusters[0]?.frequency || 0} 次</div>
        </div>
      </div>

      {/* Two Column Section: Difficulty & Weak Areas */}
      <div className="dashboard-grid-2">
        {/* Difficulty & Completion Rates */}
        <div className="cockpit-card">
          <div className="section-title">
            <span>每週教材難度與完成度分佈 (Difficulty Balance)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>家長直覺評分</span>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>難易度體感分佈</div>
            <div className="dist-bar-row">
              <span className="dist-bar-label">剛剛好 (Good)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill emerald" style={{ width: `${difficultyDistribution.good.percentage}%` }} />
              </div>
              <span className="dist-bar-count">{difficultyDistribution.good.count} ({difficultyDistribution.good.percentage}%)</span>
            </div>
            <div className="dist-bar-row">
              <span className="dist-bar-label">太難 / 吃力 (Too Hard)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill rose" style={{ width: `${difficultyDistribution.tooHard.percentage}%` }} />
              </div>
              <span className="dist-bar-count">{difficultyDistribution.tooHard.count} ({difficultyDistribution.tooHard.percentage}%)</span>
            </div>
            <div className="dist-bar-row">
              <span className="dist-bar-label">太簡單 (Too Easy)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill cyan" style={{ width: `${difficultyDistribution.tooEasy.percentage}%` }} />
              </div>
              <span className="dist-bar-count">{difficultyDistribution.tooEasy.count} ({difficultyDistribution.tooEasy.percentage}%)</span>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>完成進度分佈 (Completion Rate)</div>
            <div className="dist-bar-row">
              <span className="dist-bar-label">100% 全部完成</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill emerald" style={{ width: `${totalSubmissions > 0 ? (completionRateDistribution.rate100 / totalSubmissions) * 100 : 0}%` }} />
              </div>
              <span className="dist-bar-count">{completionRateDistribution.rate100}</span>
            </div>
            <div className="dist-bar-row">
              <span className="dist-bar-label">75% 完成大部分</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill cyan" style={{ width: `${totalSubmissions > 0 ? (completionRateDistribution.rate75 / totalSubmissions) * 100 : 0}%` }} />
              </div>
              <span className="dist-bar-count">{completionRateDistribution.rate75}</span>
            </div>
            <div className="dist-bar-row">
              <span className="dist-bar-label">50% 完成一半</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill amber" style={{ width: `${totalSubmissions > 0 ? (completionRateDistribution.rate5 / totalSubmissions) * 100 : 0}%` }} />
              </div>
              <span className="dist-bar-count">{completionRateDistribution.rate5}</span>
            </div>
            <div className="dist-bar-row">
              <span className="dist-bar-label">25% 或更少</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill rose" style={{ width: `${totalSubmissions > 0 ? ((completionRateDistribution.rate0 + completionRateDistribution.rate25) / totalSubmissions) * 100 : 0}%` }} />
              </div>
              <span className="dist-bar-count">{completionRateDistribution.rate0 + completionRateDistribution.rate25}</span>
            </div>
          </div>
        </div>

        {/* Weak Area Breakdown */}
        <div className="cockpit-card">
          <div className="section-title">
            <span>孩子卡點領域統計 (Weak Areas Reported)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>驅動下週個別化記憶</span>
          </div>

          <div style={{ marginTop: '16px' }}>
            {weakAreaDistribution.map((w) => (
              <div key={w.area} className="dist-bar-row">
                <span className="dist-bar-label">{w.label}</span>
                <div className="dist-bar-track">
                  <div
                    className={`dist-bar-fill ${w.area === 'none' ? 'emerald' : w.area === 'vocabulary' ? 'indigo' : w.area === 'grammar' ? 'amber' : 'cyan'}`}
                    style={{ width: `${w.percentage}%` }}
                  />
                </div>
                <span className="dist-bar-count">{w.count} ({w.percentage}%)</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            💡 <strong>生成引擎對接：</strong>若家長標註 weak_area（例如文法或單字），系統會在下週 Job Context 自動注入對應的主題複習提示 (Reinforcement Capsule)。
          </div>
        </div>
      </div>

      {/* Qualitative Topic Clusters & Deterministic Keywords */}
      <div className="cockpit-card" style={{ marginBottom: '24px' }}>
        <div className="section-title">
          <span>家長與孩子反饋文字聚類主題 (Topic & Keyword Intelligence)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>以確定性詞彙分群，供未來 AI Prompt 迭代</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '12px' }}>
          {topicClusters.map((cluster) => (
            <div key={cluster.topic} className="topic-cluster-card">
              <div className="topic-header">
                <span className="topic-title">{cluster.topic}</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className={`status-pill ${cluster.sentiment === 'positive' ? 'healthy' : cluster.sentiment === 'friction' ? 'failed' : 'pending'}`}>
                    {cluster.sentiment === 'positive' ? '正面訊號' : cluster.sentiment === 'friction' ? '痛點阻力' : '中性需求'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>{cluster.frequency} 次</span>
                </div>
              </div>
              <div style={{ marginTop: '6px' }}>
                {cluster.sampleQuotes.map((q, idx) => (
                  <div key={idx} className="sample-quote">
                    「{q}」
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Child Voice Direct Quotes */}
      <div className="cockpit-card" style={{ marginBottom: '24px' }}>
        <div className="section-title">
          <span>孩子真實回饋原文</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>保留最真實學習體驗</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '12px' }}>
          {childVoiceQuotes.map((q, idx) => (
            <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                <span>{q.childPseudonym}</span>
                <span>{q.materialWeek}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                「{q.quote}」
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Searchable Raw Feedback Stream */}
      <div className="cockpit-card">
        <div className="section-title search-section-title">
          <span>家長回饋明細檢索</span>
          <div className="feedback-search-controls">
            <input
              type="text"
              placeholder="搜尋關鍵字 (如: 段考, 單字, 喜歡)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="feedback-search-input"
            />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="feedback-filter-select"
            >
              <option value="all">全部難度</option>
              <option value="good">剛剛好</option>
              <option value="too_hard">太難</option>
              <option value="too_easy">太簡單</option>
            </select>
            <select
              value={weakAreaFilter}
              onChange={(e) => setWeakAreaFilter(e.target.value)}
              className="feedback-filter-select"
            >
              <option value="all">全部弱項</option>
              <option value="vocabulary">單字</option>
              <option value="grammar">文法</option>
              <option value="reading">閱讀</option>
              <option value="writing">寫作</option>
            </select>
          </div>
        </div>


        <div className="data-table-wrapper" style={{ marginTop: '12px' }}>
          <table className="cockpit-table">
            <thead>
              <tr>
                <th>時間 / 週次</th>
                <th>孩子</th>
                <th>難度</th>
                <th>完成度</th>
                <th>卡點領域</th>
                <th>孩子發言</th>
                <th>家長觀察與建議</th>
                <th>學校進度 / 興趣更新</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedback.map((fb) => (
                <tr key={fb.id}>
                  <td style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {fb.materialWeek}
                  </td>
                  <td style={{ fontWeight: 600 }}>{fb.childPseudonym}</td>
                  <td>
                    <span className={`status-pill ${fb.difficulty === 'good' ? 'healthy' : fb.difficulty === 'too_hard' ? 'failed' : 'pending'}`}>
                      {fb.difficulty}
                    </span>
                  </td>
                  <td>{fb.completionRate !== null ? `${fb.completionRate}%` : '-'}</td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fb.weakArea || '無'}</span>
                  </td>
                  <td style={{ maxWidth: '180px', fontSize: '12px', color: '#93c5fd' }}>
                    {fb.childComments ? `「${fb.childComments}」` : '-'}
                  </td>
                  <td style={{ maxWidth: '240px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {fb.parentComments || fb.mistakesText || '-'}
                  </td>
                  <td style={{ maxWidth: '180px', fontSize: '12px', color: 'var(--text-dim)' }}>
                    {fb.schoolProgressUpdate || fb.interestUpdate || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
