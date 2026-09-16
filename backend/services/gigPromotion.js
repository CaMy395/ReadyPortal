// The backup array is an ordered queue: its first eligible entry claimed first.
export function planMainStaffUnclaim(gig, username, unclaimingUserId = null) {
  const claimedBy = Array.isArray(gig.claimed_by) ? gig.claimed_by : [];
  const claimedByIds = Array.isArray(gig.claimed_by_ids) ? gig.claimed_by_ids : [];
  const backupClaimedBy = Array.isArray(gig.backup_claimed_by) ? gig.backup_claimed_by : [];
  const backupClaimedByIds = Array.isArray(gig.backup_claimed_by_ids) ? gig.backup_claimed_by_ids : [];

  if (!claimedBy.includes(username)) return null;

  const remainingStaff = claimedBy.filter((name) => name !== username);
  const remainingStaffIds = unclaimingUserId == null
    ? [...claimedByIds]
    : claimedByIds.filter((id) => Number(id) !== Number(unclaimingUserId));
  const needed = Number(gig.staff_needed) || 0;
  const promotedUsername = remainingStaff.length < needed
    ? backupClaimedBy.find((name) => name && name !== username && !remainingStaff.includes(name)) || null
    : null;

  return {
    claimedBy: promotedUsername ? [...remainingStaff, promotedUsername] : remainingStaff,
    claimedByIds: remainingStaffIds,
    backupClaimedBy: promotedUsername
      ? backupClaimedBy.filter((name) => name !== promotedUsername)
      : [...backupClaimedBy],
    backupClaimedByIds: [...backupClaimedByIds],
    promotedUsername,
  };
}

export function applyPromotedUserId(plan, promotedUserId) {
  if (!plan.promotedUsername || promotedUserId == null) return plan;
  const id = Number(promotedUserId);
  return {
    ...plan,
    claimedByIds: plan.claimedByIds.some((value) => Number(value) === id)
      ? plan.claimedByIds
      : [...plan.claimedByIds, id],
    backupClaimedByIds: plan.backupClaimedByIds.filter((value) => Number(value) !== id),
  };
}
