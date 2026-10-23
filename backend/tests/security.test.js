const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeRegex } = require('../utils/escapeRegex');
const { parseCloudinaryUrl } = require('../utils/cloudinaryAssets');
const { validateEnv } = require('../config/env');
const { createOAuthCode, consumeOAuthCode } = require('../services/oauthCodeStore');

test('escapeRegex neutralises regex metacharacters', () => {
  const input = '(a+)+$ .*';
  const regex = new RegExp(escapeRegex(input));
  assert.ok(regex.test(`foo ${input} bar`));
  assert.ok(!regex.test('aaaa'));
});

test('parseCloudinaryUrl extracts public id and resource type', () => {
  assert.deepEqual(
    parseCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v1700000000/shomadhan/evidence/evidence-1-abc.jpg'),
    { publicId: 'shomadhan/evidence/evidence-1-abc', resourceType: 'image', format: 'jpg' },
  );
  assert.deepEqual(
    parseCloudinaryUrl('https://res.cloudinary.com/demo/video/upload/shomadhan/evidence/voice-1.webm?x=1'),
    { publicId: 'shomadhan/evidence/voice-1', resourceType: 'video', format: 'webm' },
  );
});

test('parseCloudinaryUrl ignores legacy local paths and foreign hosts', () => {
  assert.equal(parseCloudinaryUrl('/uploads/evidence/a.jpg'), null);
  assert.equal(parseCloudinaryUrl('https://evil.example/image/upload/v1/a.jpg'), null);
  assert.equal(parseCloudinaryUrl(undefined), null);
});

test('validateEnv requires JWT_SECRET and rejects placeholders in production', () => {
  assert.equal(validateEnv({}).errors.length, 1);
  assert.equal(validateEnv({ JWT_SECRET: 'x'.repeat(40) }).errors.length, 0);

  const prod = validateEnv({
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://db',
    JWT_SECRET: 'shomadhan-jwt-dev-secret-key-123456',
  });
  assert.equal(prod.errors.length, 1);
});

test('OAuth codes are single use', () => {
  const code = createOAuthCode({ token: 't', isNew: false });
  assert.deepEqual(consumeOAuthCode(code), { token: 't', isNew: false });
  assert.equal(consumeOAuthCode(code), null);
  assert.equal(consumeOAuthCode('unknown'), null);
});
