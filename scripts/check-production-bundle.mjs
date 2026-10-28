import {readdir,readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'

const files=(await readdir('dist/assets')).filter(name=>name.endsWith('.js'))
const source=(await Promise.all(files.map(name=>readFile(`dist/assets/${name}`,'utf8')))).join('\n')
for(const marker of ['sample-trip-1','Ramesh Constructions','gaadihisaab-interactive-v1','Reset sample data']) {
  assert.ok(!source.includes(marker),`UI mockup content leaked into the production bundle: ${marker}`)
}
console.log('Production bundle excludes the UI mockup and its fictional records.')
