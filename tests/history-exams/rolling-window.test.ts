import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { commitRollingWindowManifest, reconcileRollingWindow } from '../../scripts/history-exams/src/corpus/rolling-window.ts'

const roots: string[] = []
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-window-')); roots.push(root)
  const dirs = Object.fromEntries(['raw', 'extracted', 'analyzed', 'assets', 'agent'].map((name) => {
    const dir = path.join(root, name); fs.mkdirSync(dir); return [name, dir]
  }))
  for (const id of ['111', '112', '113', '114', '115']) fs.writeFileSync(path.join(dirs.raw, `${id}P_English.pdf`), `pdf-${id}`)
  return dirs
}
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })))

describe('rolling five-year CAP corpus', () => {
  it('purges stale derived artifacts and reuses unchanged analyzed years only after an authoritative hash seal', () => {
    const d = fixture()
    fs.writeFileSync(path.join(d.extracted, '110.json'), '{}'); fs.mkdirSync(path.join(d.assets, '110'))
    let result = reconcileRollingWindow({ rawDir: d.raw, extractedDir: d.extracted, analyzedDir: d.analyzed, assetsDir: d.assets, agentAnalysisDir: d.agent })
    expect(result.removedExamIds).toEqual(['110'])
    expect(result.changedExamIds).toEqual(['111', '112', '113', '114', '115'])

    for (const id of result.examIds) {
      fs.writeFileSync(path.join(d.extracted, `${id}.json`), '{}')
      fs.writeFileSync(path.join(d.analyzed, `${id}.json`), '{}')
    }
    commitRollingWindowManifest(d.raw, result)

    result = reconcileRollingWindow({ rawDir: d.raw, extractedDir: d.extracted, analyzedDir: d.analyzed, assetsDir: d.assets, agentAnalysisDir: d.agent })
    expect(result.unchangedExamIds).toEqual(['111', '112', '113', '114', '115'])
    expect(result.changedExamIds).toEqual([])

    fs.appendFileSync(path.join(d.raw, '115P_English.pdf'), '-changed')
    result = reconcileRollingWindow({ rawDir: d.raw, extractedDir: d.extracted, analyzedDir: d.analyzed, assetsDir: d.assets, agentAnalysisDir: d.agent })
    expect(result.unchangedExamIds).toEqual(['111', '112', '113', '114'])
    expect(result.changedExamIds).toEqual(['115'])
  })

  it('fails before derivation when the window is not consecutive or a new year lacks a verified key', () => {
    const d = fixture(); fs.rmSync(path.join(d.raw, '111P_English.pdf')); fs.writeFileSync(path.join(d.raw, '116P_English.pdf'), 'new')
    expect(() => reconcileRollingWindow({ rawDir: d.raw, extractedDir: d.extracted, analyzedDir: d.analyzed, assetsDir: d.assets })).toThrow('no verified official 43-item answer key')
  })
})
