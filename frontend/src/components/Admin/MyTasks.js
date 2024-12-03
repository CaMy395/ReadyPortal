import React, { useState, useEffect, useCallback } from 'react';


const MyTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';


    // Fetch tasks from the backend
    const fetchTasks = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/tasks`);
            if (!response.ok) throw new Error(`Error fetching tasks: ${response.status}`);
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }, [apiUrl]);

    // Add a new task
    const addTask = async () => {
        if (newTask.trim() === '') return;
        const task = { text: newTask, completed: false };
        try {
            const response = await fetch(`${apiUrl}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task),
            });
            if (!response.ok) throw new Error(`Error adding task: ${response.status}`);
            const newTaskFromDb = await response.json();
            setTasks([...tasks, newTaskFromDb]);
            setNewTask('');
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    // Toggle task completion
    const toggleTaskCompletion = async (id, completed) => {
        try {
            const response = await fetch(`${apiUrl}/tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed }),
            });
            if (!response.ok) throw new Error(`Error updating task: ${response.status}`);
            const updatedTask = await response.json();
            setTasks((prevTasks) =>
                prevTasks.map((task) => (task.id === id ? updatedTask : task))
            );
        } catch (error) {
            console.error('Error toggling task completion:', error);
        }
    };

    // Delete a task
    const deleteTask = async (id) => {
        try {
            const response = await fetch(`${apiUrl}/tasks/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Error deleting task: ${response.status}`);
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    return (
        <div>
            <h1>My Tasks</h1>
            {/* Task Input */}
            <div>
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Enter a new task"
                    style={{ padding: '10px', width: '70%', marginRight: '10px' }}
                />
                <button
                    onClick={addTask}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#8B0000',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    Add Task
                </button>
            </div>

            {/* Task List */}
            <ul style={{ listStyleType: 'none', padding: 0, marginTop: '20px' }}>
                {tasks.map((task) => (
                    <li
                        key={task.id}
                        style={{
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px',
                            border: '1px solid #ccc',
                            borderRadius: '5px',
                            backgroundColor: task.completed ? '#d4edda' : '#f8d7da',
                        }}
                    >
                        <div
                            style={{
                                textDecoration: task.completed ? 'line-through' : 'none',
                                flex: 1,
                                textAlign: 'left',
                                marginLeft: '10px',
                                color: '#000',
                            }}
                        >
                            {task.text}
                        </div>
                        <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTaskCompletion(task.id, !task.completed)}
                            style={{ marginRight: '10px' }}
                        />
                        <button
                            onClick={() => deleteTask(task.id)}
                            style={{
                                padding: '5px 10px',
                                backgroundColor: '#8B0000',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MyTasks;
