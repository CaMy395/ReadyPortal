import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCalendarAlt, FaCheck, FaChevronDown, FaChevronRight, FaClipboardList, FaPlus, FaSearch, FaTrash } from 'react-icons/fa';

const categories = ['Lyn', 'Charlene', 'Jaleesa', 'Ace', 'Stitch'];
const priorityRank = { high: 1, medium: 2, low: 3 };
const formatDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US') : 'No due date';

export default function MyTasks() {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [openCategories, setOpenCategories] = useState(Object.fromEntries(categories.map((name) => [name, true])));
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ text: '', priority: 'Medium', dueDate: '', category: '' });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/tasks`);
      if (!response.ok) throw new Error('Unable to load tasks.');
      setTasks(await response.json());
      setError('');
    } catch (loadError) { setError(loadError.message); }
  }, [apiUrl]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async () => {
    if (!newTask.trim() || !category) { setError('Enter a task and select who it belongs to.'); return; }
    try {
      const response = await fetch(`${apiUrl}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newTask.trim(), completed: false, priority, dueDate: dueDate || null, category }) });
      if (!response.ok) throw new Error('Unable to add task.');
      const createdTask = await response.json();
      setTasks((current) => [...current, createdTask]);
      setNewTask(''); setPriority('Medium'); setDueDate(''); setCategory(''); setError('');
    } catch (addError) { setError(addError.message); }
  };

  const patchTask = async (id, changes) => {
    const response = await fetch(`${apiUrl}/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
    if (!response.ok) throw new Error('Unable to update task.');
    await fetchTasks();
  };

  const toggleTask = async (task) => { try { await patchTask(task.id, { completed: !task.completed }); } catch (updateError) { setError(updateError.message); } };
  const beginEdit = (task) => { setEditingId(task.id); setEdit({ text: task.text || '', priority: task.priority || 'Medium', dueDate: task.due_date ? String(task.due_date).slice(0, 10) : '', category: task.category || '' }); };
  const cancelEdit = () => { setEditingId(null); setEdit({ text: '', priority: 'Medium', dueDate: '', category: '' }); };
  const saveEdit = async (id) => { if (!edit.text.trim()) return; try { await patchTask(id, { text: edit.text.trim(), priority: edit.priority, dueDate: edit.dueDate || null, category: edit.category }); cancelEdit(); } catch (updateError) { setError(updateError.message); } };
  const deleteTask = async (id) => { if (!window.confirm('Delete this task?')) return; try { const response = await fetch(`${apiUrl}/tasks/${id}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Unable to delete task.'); setTasks((current) => current.filter((task) => task.id !== id)); } catch (deleteError) { setError(deleteError.message); } };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const summary = useMemo(() => ({
    open: tasks.filter((task) => !task.completed).length,
    high: tasks.filter((task) => !task.completed && String(task.priority).toLowerCase() === 'high').length,
    overdue: tasks.filter((task) => !task.completed && task.due_date && new Date(`${String(task.due_date).slice(0, 10)}T00:00:00`) < today).length,
    completed: tasks.filter((task) => task.completed).length,
  }), [tasks]);

  const grouped = useMemo(() => Object.fromEntries(categories.map((name) => [name, tasks.filter((task) => {
    if (task.category !== name) return false;
    if (status === 'open' && task.completed) return false;
    if (status === 'completed' && !task.completed) return false;
    return !search.trim() || String(task.text || '').toLowerCase().includes(search.trim().toLowerCase());
  }).sort((a, b) => Number(a.completed) - Number(b.completed) || (priorityRank[String(a.priority).toLowerCase()] || 99) - (priorityRank[String(b.priority).toLowerCase()] || 99) || String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')))])), [tasks, search, status]);

  return <main className="tasks-workspace">
    <header className="tasks-header"><div><span className="tasks-kicker">TEAM WORKSPACE</span><h1>Tasks</h1><p>Keep priorities, deadlines, and ownership clear in one place.</p></div></header>
    <section className="tasks-summary">
      <article><span><FaClipboardList /></span><div><small>OPEN</small><strong>{summary.open}</strong></div></article>
      <article className="urgent"><span>!</span><div><small>HIGH PRIORITY</small><strong>{summary.high}</strong></div></article>
      <article className="overdue"><span><FaCalendarAlt /></span><div><small>OVERDUE</small><strong>{summary.overdue}</strong></div></article>
      <article className="complete"><span><FaCheck /></span><div><small>COMPLETED</small><strong>{summary.completed}</strong></div></article>
    </section>

    <section className="task-create-panel"><div className="task-create-heading"><strong>Add a task</strong><small>Assign it now so it does not get missed.</small></div><div className="task-create-form">
      <input className="task-name-input" value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addTask()} placeholder="What needs to be done?" />
      <select value={priority} onChange={(event) => setPriority(event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select>
      <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Assign to...</option>{categories.map((name) => <option key={name}>{name}</option>)}</select>
      <button className="task-add-button" onClick={addTask}><FaPlus /> Add task</button>
    </div>{error && <div className="task-error">{error}</div>}</section>

    <section className="tasks-board"><div className="tasks-tools"><label><FaSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="open">Open tasks</option><option value="all">All tasks</option><option value="completed">Completed</option></select></div>
      {categories.map((name) => <section key={name} className={`task-category ${openCategories[name] ? 'open' : ''}`}>
        <button className="task-category-header" onClick={() => setOpenCategories((current) => ({ ...current, [name]: !current[name] }))}><span>{openCategories[name] ? <FaChevronDown /> : <FaChevronRight />}</span><strong>{name}</strong><small>{grouped[name].length} shown</small></button>
        {openCategories[name] && (grouped[name].length ? <ul className="task-list">{grouped[name].map((task) => <li key={task.id} className={`task-row ${task.completed ? 'completed' : ''}`}>
          {editingId === task.id ? <div className="task-edit-form"><input className="task-edit-name" value={edit.text} onChange={(event) => setEdit((current) => ({ ...current, text: event.target.value }))} /><select value={edit.priority} onChange={(event) => setEdit((current) => ({ ...current, priority: event.target.value }))}><option>Low</option><option>Medium</option><option>High</option></select><input type="date" value={edit.dueDate} onChange={(event) => setEdit((current) => ({ ...current, dueDate: event.target.value }))} /><select value={edit.category} onChange={(event) => setEdit((current) => ({ ...current, category: event.target.value }))}>{categories.map((person) => <option key={person}>{person}</option>)}</select><button onClick={() => saveEdit(task.id)}>Save</button><button onClick={cancelEdit}>Cancel</button></div> : <div className="task-copy"><strong>{task.text}</strong><div className="task-meta"><span className={`task-priority ${String(task.priority).toLowerCase()}`}>{task.priority}</span><span className="task-due"><FaCalendarAlt /> {formatDate(task.due_date)}</span></div></div>}
          <label className="task-check" title={task.completed ? 'Mark open' : 'Mark complete'}><input type="checkbox" checked={Boolean(task.completed)} onChange={() => toggleTask(task)} /><span><FaCheck /></span></label>
          {editingId !== task.id && <button className="task-edit-button" onClick={() => beginEdit(task)}>Edit</button>}
          <button className="task-delete-button" onClick={() => deleteTask(task.id)} title="Delete task"><FaTrash /></button>
        </li>)}</ul> : <div className="task-empty">No tasks match this view.</div>)}
      </section>)}
    </section>
  </main>;
}
