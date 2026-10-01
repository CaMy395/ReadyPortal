// Task ownership is a team roster, not a list of everyone with admin access.
export const TASK_TEAM = [
  { name: 'Matt', label: 'Matt', aliases: ['Matthew Lee', 'Matthewjlee15'] },
  { name: 'Jaleesa', label: 'Jaleesa', aliases: ['Jaleesa Barlatier', 'JaleesaB'] },
  { name: 'Lyn', label: 'Caitlyn (Lyn)', aliases: ['Caitlyn', 'Caitlyn Myland', 'Caitlyn - Lyn', 'Caitlyn (Lyn)'] },
  { name: 'Ace', label: 'Ace', aliases: [] },
  { name: 'Stitch', label: 'Stitch', aliases: [] },
  { name: 'Charlene', label: 'Charlene', aliases: ['Charlene Gray Bromfield', 'Charbrom2'] },
];

export function taskOwner(value) {
  const name = String(value || '').trim();
  return TASK_TEAM.find(person => [person.name, ...person.aliases].some(alias => alias.toLowerCase() === name.toLowerCase()))?.name || name;
}
