/**
 * Manual spam detection test script
 * Usage: node test-spam.js
 *
 * Tests the full flow against a running MongoDB instance.
 * No server needed — calls the service directly.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { checkForDuplicates } = require('./services/spamDetectionService');
const Complaint = require('./models/Complaint.model');

// ── Config ────────────────────────────────────────────────────────────────────

// Dhaka coordinates (Mirpur area)
const BASE_LAT  = 23.8103;
const BASE_LON  = 90.4125;
const NEARBY_LAT = 23.8106; // ~33m away — within 500m radius
const NEARBY_LON = 90.4128;
const FAR_LAT   = 23.8500; // ~4.5km away — outside radius
const FAR_LON   = 90.4200;

const FAKE_USER_ID = new mongoose.Types.ObjectId();

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function log(label, result, expected, detail = '') {
  const ok = result === expected;
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} ${label}`);
  if (!ok) console.log(`      Expected isSpam=${expected}, got isSpam=${result}  ${detail}`);
  if (ok) passed++; else failed++;
}

async function seedComplaint({ title, description, lat, lon, userId, hoursAgo = 1 }) {
  const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return Complaint.create({
    ticketId: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    title,
    description,
    category: 'Road',
    isAnonymous: !userId,
    user: userId || undefined,
    latitude: lat,
    longitude: lon,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
  });
}

async function cleanup(ids) {
  await Complaint.deleteMany({ _id: { $in: ids } });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n=== Spam Detection Tests ===\n');

  // ── Test 1: Same user, same location, same problem worded differently → SPAM
  console.log('Test 1: Same user + nearby location + similar text → should be SPAM');
  const c1 = await seedComplaint({
    title: 'Big pothole on the main road',
    description: 'There is a large pothole near the crossing causing accidents',
    lat: BASE_LAT, lon: BASE_LON, userId: FAKE_USER_ID,
  });
  const r1 = await checkForDuplicates(
    'Road has a huge hole',
    'A massive pit on the road near the junction is dangerous for vehicles',
    NEARBY_LAT, NEARBY_LON, FAKE_USER_ID
  );
  log('Duplicate detected', r1.isSpam, true,
    r1.isSpam ? `similarity=${r1.similarity} method=${r1.method}` : '');
  if (r1.isSpam) console.log(`      similarity=${r1.similarity} method=${r1.method} originalTicket=${r1.originalTicketId}`);
  await cleanup([c1._id]);

  // ── Test 2: Same user, far-away location, similar text → NOT SPAM (different location)
  console.log('\nTest 2: Same user + far location + similar text → should NOT be spam');
  const c2 = await seedComplaint({
    title: 'Big pothole on the main road',
    description: 'There is a large pothole near the crossing causing accidents',
    lat: BASE_LAT, lon: BASE_LON, userId: FAKE_USER_ID,
  });
  const r2 = await checkForDuplicates(
    'Road has a huge hole',
    'A massive pit on the road near the junction is dangerous for vehicles',
    FAR_LAT, FAR_LON, FAKE_USER_ID
  );
  log('Correctly allowed (far location)', r2.isSpam, false);
  await cleanup([c2._id]);

  // ── Test 3: Different user, same location, same problem → NOT SPAM
  console.log('\nTest 3: Different user + nearby location + similar text → should NOT be spam');
  const OTHER_USER = new mongoose.Types.ObjectId();
  const c3 = await seedComplaint({
    title: 'Big pothole on the main road',
    description: 'There is a large pothole near the crossing causing accidents',
    lat: BASE_LAT, lon: BASE_LON, userId: OTHER_USER,
  });
  const r3 = await checkForDuplicates(
    'Road has a huge hole',
    'A massive pit on the road near the junction is dangerous for vehicles',
    NEARBY_LAT, NEARBY_LON, FAKE_USER_ID  // ← different user submitting
  );
  log('Correctly allowed (different user)', r3.isSpam, false);
  await cleanup([c3._id]);

  // ── Test 4: Same user, same location, COMPLETELY different problem → NOT SPAM
  console.log('\nTest 4: Same user + nearby location + completely different text → should NOT be spam');
  const c4 = await seedComplaint({
    title: 'Garbage not collected for a week',
    description: 'Waste bins overflowing with trash and causing bad smell in the area',
    lat: BASE_LAT, lon: BASE_LON, userId: FAKE_USER_ID,
  });
  const r4 = await checkForDuplicates(
    'Street light is broken',
    'The electricity pole lamp has not been working for three nights making road unsafe',
    NEARBY_LAT, NEARBY_LON, FAKE_USER_ID
  );
  log('Correctly allowed (different problem)', r4.isSpam, false);
  await cleanup([c4._id]);

  // ── Test 5: Anonymous complaint → SKIP spam check (should NOT be spam)
  console.log('\nTest 5: Anonymous complaint (no userId) → spam check skipped');
  const c5 = await seedComplaint({
    title: 'Big pothole on the main road',
    description: 'There is a large pothole near the crossing causing accidents',
    lat: BASE_LAT, lon: BASE_LON, userId: null,
  });
  const r5 = await checkForDuplicates(
    'Road has a huge hole',
    'A massive pit on the road near the junction is dangerous for vehicles',
    NEARBY_LAT, NEARBY_LON,
    null  // ← anonymous
  );
  log('Spam check skipped for anonymous', r5.isSpam, false);
  await cleanup([c5._id]);

  // ── Test 6: Same user, same location, complaint older than 24h → NOT SPAM
  console.log('\nTest 6: Same user + nearby + similar text but 25h ago → should NOT be spam');
  const c6 = await seedComplaint({
    title: 'Big pothole on the main road',
    description: 'There is a large pothole near the crossing causing accidents',
    lat: BASE_LAT, lon: BASE_LON, userId: FAKE_USER_ID,
    hoursAgo: 25,  // outside 24h window
  });
  const r6 = await checkForDuplicates(
    'Road has a huge hole',
    'A massive pit on the road near the junction is dangerous for vehicles',
    NEARBY_LAT, NEARBY_LON, FAKE_USER_ID
  );
  log('Correctly allowed (outside time window)', r6.isSpam, false);
  await cleanup([c6._id]);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n─────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`─────────────────────────────\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB:', process.env.MONGODB_URI);
    await runTests();
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await mongoose.disconnect();
  }
})();
