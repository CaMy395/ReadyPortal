const migrations = new WeakMap();
export const TASK_PROGRESS = ['not_started', 'in_progress', 'needs_supervisor'];

export function ensureTaskProgress(pool) {
  if (!migrations.has(pool)) {
    migrations.set(pool, pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_status text NOT NULL DEFAULT 'not_started' CHECK (progress_status IN ('not_started', 'in_progress', 'needs_supervisor'))`).catch((error) => {
      migrations.delete(pool);
      throw error;
    }));
  }
  return migrations.get(pool);
}
