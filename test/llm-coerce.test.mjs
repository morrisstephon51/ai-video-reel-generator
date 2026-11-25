import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { coerceScore, coerceStringList, coerceText } from '../src/lib/llm-coerce.ts'

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('coerceScore: numbers clamp to 0..100', () => {
  assert.equal(coerceScore(85, 50), 85)
  assert.equal(coerceScore(140, 50), 100)
  assert.equal(coerceScore(-3, 50), 0)
})

test('coerceScore: numeric strings are accepted', () => {
  assert.equal(coerceScore('85', 50), 85)
  assert.equal(coerceScore(' 72.5 ', 50), 72.5)
})

test('coerceScore: non-numeric values fall back instead of becoming NaN', () => {
  for (const bad of ['85/100', 'high', '', null, undefined, NaN, Infinity, {}, [90], true]) {
    const got = coerceScore(bad, 50)
    assert.ok(Number.isFinite(got), `${JSON.stringify(bad)} -> ${got}`)
    assert.equal(got, 50, `${String(bad)} should fall back`)
  }
})

test('coerceStringList: a bare string is ONE fix, not one per character', () => {
  assert.deepEqual(coerceStringList('Tighten the hook'), ['Tighten the hook'])
  // the old code did [...'Tighten the hook'] -> 16 one-char "fixes"
})

test('coerceStringList: drops non-strings and blanks, never throws', () => {
  assert.deepEqual(coerceStringList(['a', 2, null, ' ', ' b ']), ['a', 'b'])
  assert.deepEqual(coerceStringList({ fix: 'x' }), [])   // spreading an object threw TypeError
  assert.deepEqual(coerceStringList(undefined), [])
  assert.deepEqual(coerceStringList(42), [])
})

test('coerceText: non-strings fall back', () => {
  assert.equal(coerceText('ok', ''), 'ok')
  assert.equal(coerceText({ a: 1 }, ''), '')
  assert.equal(coerceText(undefined, 'd'), 'd')
})

// Call-site contract: the helpers only matter if the routes actually use them.
test('agent-review runAgent coerces every model field', () => {
  const src = read('src/app/api/agent-review/route.ts')
  assert.match(src, /score:\s*coerceScore\(parsed\?\.score,/)
  assert.match(src, /critique:\s*coerceText\(parsed\?\.critique,/)
  assert.match(src, /fixes:\s*coerceStringList\(parsed\?\.fixes\)/)
  assert.doesNotMatch(src, /parsed\.fixes\s*\?\?\s*\[\]/)
  assert.doesNotMatch(src, /Math\.max\(0,\s*parsed\.score/)
})

test('hook-optimizer scores go through coerceScore', () => {
  const src = read('src/app/api/agents/hook-optimizer/route.ts')
  assert.match(src, /score:\s*coerceScore\(score,\s*50\)/)
  assert.doesNotMatch(src, /Math\.max\(0,\s*score\s*\?\?/)
})
