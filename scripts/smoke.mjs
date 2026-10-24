#!/usr/bin/env node
/**
 * Smoke test of the *compiled* package through its public `exports` map, in both CommonJS and
 * ESM, with `react-native` replaced by a stub (Node cannot load the real one).
 */
import {register, createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const stub = pathToFileURL(path.join(root, 'scripts', 'rn-stub.cjs')).href;

// ESM: redirect `react-native` to the stub.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        if (spec === 'react-native') return {url: ${JSON.stringify(stub)}, shortCircuit: true};
        return next(spec, ctx);
      }`),
);

// CJS: same redirection.
const require = createRequire(import.meta.url);
const Module = require('node:module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'react-native') return path.join(root, 'scripts', 'rn-stub.cjs');
  return origResolve.call(this, request, ...rest);
};

const expectSdp = 16 * (411 / 300);
const entries = [
  '',
  '/power',
  '/percent',
  '/resize',
  '/units',
  '/custom',
  '/number',
  '/fluid/number',
  '/custom/number',
];

for (const e of entries) {
  const id = `appdimens-react-native${e}`;
  const cjs = require(id);
  const esm = await import(id);
  assert.ok(Object.keys(cjs).length > 0 || e.includes('number'), `CJS ${id} has exports`);
  assert.deepEqual(
    Object.keys(esm).sort(),
    Object.keys(cjs)
      .filter(k => k !== '__esModule')
      .sort()
      .concat(e.includes('number') ? [] : [])
      .sort(),
    `ESM/CJS export parity for ${id}`,
  );
}

const main = await import('appdimens-react-native');
assert.ok(Math.abs(main.sdp(16) - expectSdp) < 1e-9, 'sdp(16)');
assert.equal(main.VERSION, '3.2.0');
assert.ok(main.scaledDp(10).screen('PORTRAIT', 20).sdp > 0, 'builder');
const power = await import('appdimens-react-native/power');
assert.ok(Math.abs(power.pwsdp(16) - 16 * Math.pow(411 / 300, 0.75)) < 1e-9, 'pwsdp(16)');
const percent = await import('appdimens-react-native/percent');
assert.ok(Math.abs(percent.spaceW(10) - 41.1) < 1e-9, 'spaceW(10)');
assert.ok(Math.abs((16).sdp - expectSdp) < 1e-9, 'Number extension (16).sdp');
const custom = await import('appdimens-react-native/custom');
const brand = custom.defineCustomStrategy({id: 'smoke', curve: {type: 'power', exponent: 0.8}});
assert.ok(Math.abs(custom.cdp(16, brand) - 16 * Math.pow(411 / 300, 0.8)) < 1e-9, 'cdp(16, brand)');
assert.ok(Math.abs(custom.cdp(16) - expectSdp) < 1e-9, 'cdp(16) default = sdp');
assert.ok((16).fsdp > 0, 'Number extension (16).fsdp');
console.log(`smoke OK — ${entries.length} entry points, CJS + ESM`);
