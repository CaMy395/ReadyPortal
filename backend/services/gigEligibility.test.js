import test from 'node:test';
import assert from 'node:assert/strict';
import { canClaimMainGig } from '../../frontend/src/utils/gigEligibility.mjs';
import { planMainStaffUnclaim } from './gigPromotion.js';

test('students can claim main server and barback shifts, never bartender or unspecified shifts', () => {
  for (const position of ['Server', ' servers ', 'Barback', 'Bar Back']) assert.equal(canClaimMainGig('student', position), true);
  for (const position of ['Bartender', 'Lead Bartender', 'Bartender / Server', '', null]) assert.equal(canClaimMainGig('student', position), false);
  assert.equal(canClaimMainGig('user', 'Bartender'), true);
  assert.equal(canClaimMainGig('admin', 'Bartender'), true);
});

test('bartender promotion skips students without removing their backup places', () => {
  const gig = { staff_needed: 1, claimed_by: ['leaving'], backup_claimed_by: ['student', 'staff'] };
  const plan = planMainStaffUnclaim(gig, 'leaving', null, name => canClaimMainGig(name === 'student' ? 'student' : 'user', 'Bartender'));
  assert.equal(plan.promotedUsername, 'staff');
  assert.deepEqual(plan.backupClaimedBy, ['student']);
  assert.equal(planMainStaffUnclaim(gig, 'leaving', null, () => false).promotedUsername, null);
  assert.equal(planMainStaffUnclaim(gig, 'leaving', null, () => canClaimMainGig('student', 'Server')).promotedUsername, 'student');
});
