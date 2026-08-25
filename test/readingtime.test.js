const test = require('node:test');
const assert = require('node:assert/strict');
const readingTime = require('../utils/readingtime');

test('returns precise minute-and-second estimates at 200 WPM', () => {
  assert.equal(readingTime.fromWordCount(0).label, '0 min read');
  assert.equal(readingTime.fromWordCount(1).label, '1 sec read');
  assert.equal(readingTime.fromWordCount(100).label, '30 sec read');
  assert.equal(readingTime.fromWordCount(200).label, '1 min read');
  assert.equal(readingTime.fromWordCount(300).label, '1 min 30 sec read');
  assert.equal(readingTime.fromWordCount(400).label, '2 min read');
});

test('counts normalized text words', () => {
  const result = readingTime('one   two\nthree');
  assert.equal(result.words, 3);
  assert.equal(result.wordsPerMinute, 200);
});
