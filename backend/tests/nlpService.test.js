const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyComplaint } = require('../services/nlpService');

test('classifies multilingual water complaints as water authority', async () => {
  const result = await classifyComplaint('পানি', 'বৃষ্টির পর বাড়ির সামনে পানি জমে আছে, নর্দমা বন্ধ');

  assert.equal(result.category, 'water_authority');
  assert.equal(result.department.key, 'water_authority');
  assert.equal(result.needsManualReview, false);
});

test('marks vague input as requiring manual review', async () => {
  const result = await classifyComplaint('helo', 'hello there only');

  assert.equal(result.category, null);
  assert.equal(result.needsManualReview, true);
  assert.equal(result.topCategories.length, 0);
});
