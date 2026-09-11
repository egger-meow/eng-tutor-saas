import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { createClient } from '../apps/web/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:55321'
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

const TEST_PARENT_ID = '99999999-9999-4999-8999-999999999999'
const TEST_PARENT_EMAIL = 'walkthrough_parent@example.com'
const TEST_CHILD_ID = '88888888-8888-4888-8888-888888888888'

mkdirSync('output/screenshots', { recursive: true })

async function setupFixtures() {
  console.log('1. Setting up database test fixtures...')

  // Clean up any prior test session for this child
  await adminSupabase.from('assessment_responses').delete().eq('child_id', TEST_CHILD_ID)
  await adminSupabase.from('assessment_sessions').delete().eq('child_id', TEST_CHILD_ID)
  await adminSupabase.from('child_assessment_state').delete().eq('child_id', TEST_CHILD_ID)
  await adminSupabase.from('child_profiles').delete().eq('child_id', TEST_CHILD_ID)
  await adminSupabase.from('children').delete().eq('id', TEST_CHILD_ID)
  await adminSupabase.from('profiles').delete().eq('id', TEST_PARENT_ID)
  await adminSupabase.auth.admin.deleteUser(TEST_PARENT_ID).catch(() => {})

  // Create user
  const { data: userData, error: userError } = await adminSupabase.auth.admin.createUser({
    id: TEST_PARENT_ID,
    email: TEST_PARENT_EMAIL,
    password: 'Password123!',
    email_confirm: true,
  })
  if (userError) throw userError

  // Insert profile
  await adminSupabase.from('profiles').upsert({
    id: TEST_PARENT_ID,
    display_name: 'Walkthrough Parent',
  })

  // Insert child
  const { error: childError } = await adminSupabase.from('children').insert({
    id: TEST_CHILD_ID,
    parent_id: TEST_PARENT_ID,
    display_name: '翔翔',
    grade: 7,
    grade_stage: 'grade_7',
    is_active: true,
  })
  if (childError) throw childError

  // Insert child profile
  await adminSupabase.from('child_profiles').insert({
    child_id: TEST_CHILD_ID,
    grade: 'grade_7',
    baseline_level: 'on-level',
  })

  console.log('   Fixtures ready.')
}

async function run() {
  await setupFixtures()

  console.log('2. Starting Vite dev server on port 5179...')
  const devServer = spawn(
    'npx',
    ['vite', '--port', '5179', '--host', '127.0.0.1'],
    {
      cwd: 'apps/web',
      shell: true,
      env: {
        ...process.env,
        VITE_SUPABASE_URL: SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: ANON_KEY,
      },
      stdio: 'pipe',
    }
  )

  // Wait for server to be ready
  await new Promise((resolve) => {
    devServer.stdout.on('data', (d) => {
      const str = d.toString()
      if (str.includes('Local:') || str.includes('5179')) {
        resolve(true)
      }
    })
    setTimeout(resolve, 3000)
  })

  console.log('3. Launching Chromium via Playwright...')
  const browser = await chromium.launch({ headless: true })

  try {
    // Generate auth token for the test user
    const client = createClient(SUPABASE_URL, ANON_KEY)
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: TEST_PARENT_EMAIL,
      password: 'Password123!',
    })
    if (authError) throw authError

    const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0] || 'localhost'}-auth-token`

    // Setup desktop context
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })

    const page = await context.newPage()

    // Navigate to root
    await page.goto('http://127.0.0.1:5179/')

    // Inject auth session
    await page.evaluate(
      ({ key, session }) => {
        window.localStorage.setItem(key, JSON.stringify(session))
      },
      { key: storageKey, session: authData.session }
    )

    // Reload with authenticated state
    console.log('4. Navigating to Dashboard...')
    await page.goto('http://127.0.0.1:5179/')
    await page.waitForSelector('.child-dashboard-card', { timeout: 10000 })

    // Verify Recommendation Card
    console.log('   Verifying assessment recommendation on child card...')
    await page.waitForSelector('.assessment-recommendation-panel', { timeout: 5000 })
    const recText = await page.textContent('.assessment-recommendation-panel')
    console.log('   Recommendation text preview:', recText?.slice(0, 50))
    await page.screenshot({ path: 'output/screenshots/01-dashboard-recommendation.png' })

    // Click Start Assessment
    console.log('5. Clicking 開始程度診斷...')
    await page.click('.assessment-recommendation-panel a')

    // Verify Intro Page
    await page.waitForSelector('.assessment-intro-card', { timeout: 8000 })
    console.log('   Intro page displayed.')
    await page.screenshot({ path: 'output/screenshots/02-intro-page.png' })

    // Click Start on Intro Page
    console.log('6. Clicking 開始程度診斷 on Intro card to enter Question Shell...')
    await page.click('.assessment-intro-card button')

    // Wait for Question Shell
    await page.waitForSelector('.assessment-question-card', { timeout: 8000 })
    console.log('   Question 1 displayed.')
    await page.screenshot({ path: 'output/screenshots/03-question-shell.png' })

    // Answer Question 1 (Single choice)
    const choices = await page.$$('.assessment-choice-btn')
    if (choices.length > 0) {
      console.log(`   Found ${choices.length} choices. Selecting choice 0...`)
      await choices[0].click()
      await page.waitForTimeout(300)
      console.log('   Submitting answer...')
      await page.click('.assessment-submit-btn')
    } else {
      console.log('   Short answer question detected. Typing answer...')
      await page.fill('.assessment-text-input', 'sample answer')
      await page.click('.assessment-submit-btn')
    }

    // Wait for Question 2
    await page.waitForTimeout(1000)
    await page.waitForSelector('.assessment-question-card', { timeout: 8000 })
    console.log('7. Question 2 rendered.')
    await page.screenshot({ path: 'output/screenshots/04-question-two.png' })

    // Test Skip on Question 2
    console.log('8. Testing skip action (我不確定，跳過這題)...')
    await page.click('.assessment-skip-btn')
    await page.waitForTimeout(1000)

    // Test Exit/Pause and return to dashboard
    console.log('9. Clicking 暫停並返回學習頁...')
    await page.click('.assessment-exit-btn')
    await page.waitForSelector('.child-dashboard-card', { timeout: 8000 })

    // Verify Resume state on Dashboard
    console.log('   Checking dashboard CTA state...')
    await page.waitForSelector('.assessment-recommendation-panel', { timeout: 5000 })
    const resumedText = await page.textContent('.assessment-recommendation-panel')
    console.log('   Resumed panel content:', resumedText)
    await page.screenshot({ path: 'output/screenshots/05-dashboard-resumed.png' })

    // Re-enter assessment via Resume button
    console.log('10. Clicking 繼續程度診斷 to resume...')
    await page.click('.assessment-recommendation-panel a')
    await page.waitForSelector('.assessment-question-card', { timeout: 8000 })

    // Complete remaining items by fast answers/skips
    console.log('11. Answering/skipping remaining items to reach completion...')
    let rounds = 0
    while (rounds < 25) {
      rounds++
      const isCompleted = await page.$('.assessment-result-view')
      if (isCompleted) break

      const skipBtn = await page.$('.assessment-skip-btn')
      if (skipBtn) {
        await skipBtn.click()
        await page.waitForTimeout(400)
      } else {
        break
      }
    }

    // Verify Completed Result Page
    console.log('12. Waiting for Result Page...')
    await page.waitForSelector('.assessment-result-view', { timeout: 10000 })
    console.log('   Result page loaded successfully!')
    await page.screenshot({ path: 'output/screenshots/06-result-page-desktop.png', fullPage: true })

    // Mobile Viewport Walkthrough
    console.log('13. Capturing Mobile Viewport (390x844)...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto('http://127.0.0.1:5179/')
    await mobilePage.evaluate(
      ({ key, session }) => {
        window.localStorage.setItem(key, JSON.stringify(session))
      },
      { key: storageKey, session: authData.session }
    )
    await mobilePage.goto(`http://127.0.0.1:5179/children/${TEST_CHILD_ID}/assessment`)
    await mobilePage.waitForSelector('.assessment-result-view', { timeout: 10000 })
    await mobilePage.screenshot({ path: 'output/screenshots/07-result-page-mobile.png', fullPage: true })

    console.log('14. Clicking 回到孩子學習頁 on result page...')
    await page.click('.assessment-result-view .assessment-completion-footer button')
    await page.waitForSelector('.child-dashboard-card', { timeout: 8000 })
    await page.waitForSelector('.assessment-recommendation-panel', { timeout: 5000 })
    const finalRecText = await page.textContent('.assessment-recommendation-panel')
    console.log('   Final dashboard CTA state:', finalRecText)
    await page.screenshot({ path: 'output/screenshots/08-dashboard-completed.png' })

    console.log('ALL WALKTHROUGH CHECKS PASSED!')
  } finally {
    await browser.close()
    devServer.kill()
  }
}

run().catch((err) => {
  console.error('Walkthrough failed:', err)
  process.exit(1)
})
