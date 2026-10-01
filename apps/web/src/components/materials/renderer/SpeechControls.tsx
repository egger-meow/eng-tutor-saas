import type { useSpeechSynthesis } from '../../../hooks/use-speech-synthesis'

export function SpeechControls({ speech }: { speech: ReturnType<typeof useSpeechSynthesis> }) {
  return <div className="speech-controls">
    {!speech.isSupported ? <p className="muted">此瀏覽器不支援裝置朗讀，可繼續閱讀與作答。</p> : <>
      {speech.voices?.length ? <label>裝置英文語音 <select value={speech.voiceURI} onChange={(event) => speech.setVoiceURI(event.target.value)}>
        <option value="">裝置預設</option>
        {speech.voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}
      </select></label> : <p className="muted">使用裝置預設英文語音。</p>}
      <button className="button button-secondary speech-stop" type="button" disabled={!speech.isSpeaking} onClick={speech.stop}>停止朗讀</button>
      {speech.error && <p role="alert">{speech.error}</p>}
    </>}
  </div>
}
