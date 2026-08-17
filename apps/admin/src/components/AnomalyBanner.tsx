import React from 'react'

interface AnomalyBannerProps {
  anomalies: string[]
  isCritical?: boolean
}

export const AnomalyBanner: React.FC<AnomalyBannerProps> = ({ anomalies, isCritical }) => {
  if (!anomalies || anomalies.length === 0) return null

  return (
    <div className={`anomaly-banner ${isCritical ? 'critical' : ''}`}>
      <div>
        <div className="anomaly-title">
          <span>{isCritical ? '🚨 系統警報：發現嚴重異常情況' : '⚠️ 維運提醒：發現異常狀況需排查'}</span>
        </div>
        <ul className="anomaly-list">
          {anomalies.map((item, idx) => (
            <li key={idx}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
