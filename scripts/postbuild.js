#!/usr/bin/env node
/** Marks the module flavour of each build output so Node resolves `exports` correctly. */
'use strict';
const fs = require('fs');
const path = require('path');

const lib = path.resolve(__dirname, '..', 'lib');
fs.writeFileSync(path.join(lib, 'commonjs', 'package.json'), '{\n  "type": "commonjs"\n}\n');
fs.writeFileSync(path.join(lib, 'module', 'package.json'), '{\n  "type": "module"\n}\n');
console.log('postbuild: wrote lib/commonjs/package.json and lib/module/package.json');
