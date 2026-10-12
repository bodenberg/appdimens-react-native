#!/usr/bin/env node
/**
 * Micro-benchmark of the compiled kernels (run `npm run build` first).
 * Prints ns/op for the hot paths and for the generic (`toDynamic*`) and builder paths.
 */
'use strict';
const path = require('path');
const Module = require('module');

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'react-native') return path.join(__dirname, 'rn-stub.cjs');
  return origResolve.call(this, request, ...rest);
};

const lib = require(path.join(__dirname, '..', 'lib', 'commonjs', 'index.js'));
const power = require(
  path.join(__dirname, '..', 'lib', 'commonjs', 'strategies', 'power', 'index.js'),
);

const N = 5_000_000;
// A fresh loop per benchmark keeps every call site monomorphic (like real component code).
function bench(label, fn) {
  // eslint-disable-next-line no-new-func
  const run = new Function(
    'fn',
    'n',
    'let acc = 0; for (let i = 0; i < n; i++) acc += fn(i & 63); return acc;',
  );
  run(fn, 300_000); // warm-up / JIT
  const t0 = process.hrtime.bigint();
  const acc = run(fn, N);
  const ns = Number(process.hrtime.bigint() - t0) / N;
  console.log(`${label.padEnd(44)} ${ns.toFixed(2).padStart(7)} ns/op`);
  return acc;
}

const builder = lib.scaledDp(16).screen('TELEVISION', 30).screen('SMALL_WIDTH', 600, 24);
let sink = 0;
sink += bench('baseline: v * constant', v => v * 1.37);
sink += bench('sdp(v)', lib.sdp);
sink += bench('sdpa(v) (aspect ratio)', lib.sdpa);
sink += bench('hdpLw(v) (inverter)', lib.hdpLw);
sink += bench('ssp(v)', lib.ssp);
sink += bench('sdpPx(v)', lib.sdpPx);
sink += bench('pwsdp(v) (power)', power.pwsdp);
sink += bench("toDynamicScaledDp(v, 'HEIGHT', opts)", v =>
  lib.toDynamicScaledDp(v, 'HEIGHT', {applyAspectRatio: true}),
);
sink += bench('sdpRotate(v, 20)', v => lib.sdpRotate(v, 20));
sink += bench('builder.sdp (2 screen entries)', () => builder.sdp);
if (Number.isNaN(sink)) console.log('');
