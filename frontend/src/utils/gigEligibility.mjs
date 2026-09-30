export function canClaimMainGig(role, position) {
  if (String(role).toLowerCase() !== 'student') return true;
  return /^(server|servers|barback|barbacks|bar back|bar backs)$/i.test(String(position || '').trim());
}
