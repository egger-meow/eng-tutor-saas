import { readFile, writeFile } from 'node:fs/promises'

const path = 'packages/generator/src/finisher-tiers.test.ts'
let content = await readFile(path, 'utf8')
const from = `    const ceilingFinding = audit.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(ceilingFinding).toBeDefined()
    expect(ceilingFinding?.severity).toBe('warning')`
const to = `    const ceilingFinding = audit.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(ceilingFinding).toBeUndefined()`
if (!content.includes(from)) throw new Error('lexical ceiling expectation anchor not found')
content = content.replace(from, to)
await writeFile(path, content)
console.log('Aligned lexical ceiling regression with suppressed fixed-list heuristic.')
