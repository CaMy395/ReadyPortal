// Task ownership is a team roster, not a list of everyone with admin access.
export const TASK_TEAM = [
  { name: 'Bryan', label: 'Bryan', aliases: [] },
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

export function taskAssignees(users = []) {
  const people = TASK_TEAM.map(({ name, label }) => ({ name, label }));
  for (const user of users) {
    const name = taskOwner(user.name || user.username);
    if (!name || ['matt', 'matthew lee', 'matthewjlee15'].includes(name.toLowerCase())) continue;
    if (!people.some(person => person.name.toLowerCase() === name.toLowerCase())) people.push({ name, label: name });
  }
  return people;
}
