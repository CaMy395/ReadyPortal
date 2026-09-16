import test from 'node:test';
import assert from 'node:assert/strict';
import { planMainStaffUnclaim, applyPromotedUserId } from './gigPromotion.js';

test('promotes backups in claim order and keeps username and ID arrays aligned', () => {
  const gig = {
    staff_needed: 2,
    claimed_by: ['alex', 'blair'],
    claimed_by_ids: [1, 2],
    backup_claimed_by: ['casey', 'drew'],
    backup_claimed_by_ids: [3, 4],
  };

  const first = applyPromotedUserId(planMainStaffUnclaim(gig, 'alex', 1), 3);
  assert.equal(first.promotedUsername, 'casey');
  assert.deepEqual(first.claimedBy, ['blair', 'casey']);
  assert.deepEqual(first.claimedByIds, [2, 3]);
  assert.deepEqual(first.backupClaimedBy, ['drew']);
  assert.deepEqual(first.backupClaimedByIds, [4]);

  const second = applyPromotedUserId(planMainStaffUnclaim({
    ...gig,
    claimed_by: first.claimedBy,
    claimed_by_ids: first.claimedByIds,
    backup_claimed_by: first.backupClaimedBy,
    backup_claimed_by_ids: first.backupClaimedByIds,
  }, 'blair', 2), 4);
  assert.equal(second.promotedUsername, 'drew');
  assert.deepEqual(second.claimedBy, ['casey', 'drew']);
  assert.deepEqual(second.backupClaimedBy, []);
});

test('does not promote when no backup is eligible or a main slot is already full', () => {
  assert.equal(planMainStaffUnclaim({ claimed_by: [] }, 'alex'), null);
  const noBackup = planMainStaffUnclaim({ staff_needed: 1, claimed_by: ['alex'] }, 'alex', 1);
  assert.equal(noBackup.promotedUsername, null);
  assert.deepEqual(noBackup.claimedBy, []);

  const stillFull = planMainStaffUnclaim({
    staff_needed: 1,
    claimed_by: ['alex', 'blair'],
    backup_claimed_by: ['casey'],
  }, 'alex');
  assert.equal(stillFull.promotedUsername, null);
  assert.deepEqual(stillFull.backupClaimedBy, ['casey']);
});

test('skips a stale backup already on main staff and chooses the next claimant', () => {
  const plan = planMainStaffUnclaim({
    staff_needed: 2,
    claimed_by: ['alex', 'blair'],
    backup_claimed_by: ['blair', 'casey', 'drew'],
  }, 'alex');
  assert.equal(plan.promotedUsername, 'casey');
  assert.deepEqual(plan.backupClaimedBy, ['blair', 'drew']);
});
