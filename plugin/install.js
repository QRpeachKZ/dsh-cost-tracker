#!/usr/bin/env node
// dsh-cost-tracker — installer helper
// ===================================
// Reads plugin/host.js and plugin/client.js, validates their JavaScript syntax,
// and prints the exact `cordis_define` payload as JSON.
//
// The plugin is a DYNAMIC Cordis plugin: it is installed through the cordis
// toolset (cordis_define + cordis_run), which is available to an agent running
// on the `cordis` agent preset. This script only prepares the payload; the
// actual install happens in the harness.
//
// Usage:
//   node plugin/install.js            # validate + print the define payload
//   node plugin/install.js --json     # print only the JSON payload

const fs = require('fs')
const path = require('path')
const vm = require('vm')

const dir = __dirname
const host = fs.readFileSync(path.join(dir, 'host.js'), 'utf8')
const client = fs.readFileSync(path.join(dir, 'client.js'), 'utf8')

// Validate syntax by compiling each half as a function body.
for (const [name, src] of [['host', host], ['client', client]]) {
  try {
    new vm.Script(`(function(){${src}\n})`)
  } catch (e) {
    console.error(`SYNTAX ERROR in ${name}.js: ${e.message}`)
    process.exit(1)
  }
}

const payload = {
  plugin: { kind: 'new', idPrefix: 'cost' },
  name: 'model-cost-tracker',
  purpose: 'Shows per-session model cost in $ with configurable prices and a peak-time fire ring/flame.',
  code: { host, client },
}

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(payload))
} else {
  console.log('plugin/host.js and plugin/client.js: syntax OK')
  console.log('\n=== cordis_define payload (JSON) ===')
  console.log(JSON.stringify(payload, null, 2))
}