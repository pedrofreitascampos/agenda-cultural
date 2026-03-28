#!/usr/bin/env node

/**
 * Test runner — runs all test files and reports results.
 * Exit code 0 on success, 1 on failure.
 */

'use strict';

const path = require('path');

const testFiles = [
  './test-normalize.js',
  './test-filter.js',
  './test-pipeline.js',
  './test-geocode.js',
  './test-culturaptgov.js',
];

let totalPass = 0;
let totalFail = 0;
const failures = [];

async function runFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  const tests = require(fullPath);
  const fileName = path.basename(filePath);

  console.log(`\n\u2501\u2501\u2501 ${fileName} \u2501\u2501\u2501`);

  for (const { name, fn } of tests) {
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        await result;
      }
      console.log(`  \u2713 ${name}`);
      totalPass++;
    } catch (err) {
      console.log(`  \u2717 ${name}`);
      console.log(`    ${err.message}`);
      if (err.expected !== undefined && err.actual !== undefined) {
        console.log(`    expected: ${JSON.stringify(err.expected)}`);
        console.log(`    actual:   ${JSON.stringify(err.actual)}`);
      }
      totalFail++;
      failures.push({ file: fileName, test: name, error: err.message });
    }
  }
}

async function main() {
  console.log('Agora \u2014 Test Suite');
  console.log('==========================');

  for (const file of testFiles) {
    await runFile(file);
  }

  console.log('\n==========================');
  console.log(`Results: ${totalPass} passed, ${totalFail} failed, ${totalPass + totalFail} total`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => {
      console.log(`  [${f.file}] ${f.test}: ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('\nAll tests passed.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
