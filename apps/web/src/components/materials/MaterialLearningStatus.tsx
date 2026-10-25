import { useMaterialProgress } from './MaterialProgress'

export function MaterialLearningStatus({ materialId }: { materialId: string }) {
  const { loading, failed, started, submission, retry } = useMaterialProgress(materialId)
  const label = loading ? '正在確認學習進度…' : failed ? '進度暫時無法確認，仍可開啟教材'
    : submission ? submission.next_request_status === 'failed' || submission.next_request_status === 'canceled'
      ? '已提交 · 下一份未完成，請聯絡我們協助恢復'
      : submission.next_requested ? '已提交 · 已申請下一份' : '已提交 · 可查看結果及申請下一份'
    : started ? '草稿已保存 · 繼續作答' : '可開始閱讀與作答（今天先 10 分鐘）'
  return <p className="muted" role="status">{label} {failed && <button type="button" className="button-link text-link" onClick={retry}>重試進度</button>}</p>
}
