import './App.css'

const foundations = [
  ['每週一份', '學生教材與家長解答分開，適合直接列印。'],
  ['每位孩子獨立', '程度、歷史、回饋與訂閱不會在手足之間混用。'],
  ['AI 在幕後', '教材鼓勵孩子先思考，再請 AI 解釋，而不是代答。'],
]

function App() {
  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">紙屬英文 · Repository Foundation</p>
        <h1 id="page-title">把每週英文練習，變成孩子做得到的節奏。</h1>
        <p className="lede">
          面向台灣國中生的個人化紙本教材。家長掌握進度，孩子專心閱讀、作答與訂正。
        </p>
        <p className="status">目前正在建立安全的 beta 基礎，尚未開放註冊。</p>
      </section>

      <section className="principles" aria-label="產品原則">
        {foundations.map(([title, description]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
