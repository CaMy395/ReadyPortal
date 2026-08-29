import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Edit3, Filter, Plus, Trash2, X } from 'lucide-react';
import '../../App.css';
import appointmentTypes from '../../data/appointmentTypes.json';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalTimestampDateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : toDateKey(date);
};

const emptyAppointment = (date = '') => ({
  title: '', client: '', date, time: '', endTime: '', description: '',
  assigned_staff: ['Lyn'], recurrence: '', occurrences: 1, weekdays: [],
});

const SchedulingPage = () => {
  const [gigs, setGigs] = useState([]);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [recurringDays, setRecurringDays] = useState([]);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(1);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('');
  const [blockDuration, setBlockDuration] = useState(1);
  const [blockLabel, setBlockLabel] = useState('');
  const [editingBlockedTime, setEditingBlockedTime] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [showPlusOptionsModal, setShowPlusOptionsModal] = useState(false);
  const [scheduleLabels, setScheduleLabels] = useState([]);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [newLabel, setNewLabel] = useState({ date: '', time: '', label: '' });
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [notifyClient, setNotifyClient] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ appointments: true, gigs: true, events: true, blocks: true, tasks: true });

  const [isWeekView, setIsWeekView] = useState(() => {
    const saved = localStorage.getItem('isWeekView');
    return saved === null ? true : saved === 'true';
  });

  const [newAppointment, setNewAppointment] = useState(() => emptyAppointment());

  const [editingAppointment, setEditingAppointment] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    localStorage.setItem('isWeekView', String(isWeekView));
  }, [isWeekView]);

  const fetchBlockedTimes = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/schedule/block`);

      if (response.data.blockedTimes && response.data.blockedTimes.length > 0) {
        const updatedBlockedTimes = response.data.blockedTimes.map(({ timeSlot, label, date }) => ({
          timeSlot: timeSlot.trim(),
          label: label ? label.trim() : 'Blocked',
          date: toDateKey(date),
        }));

        setBlockedTimes(updatedBlockedTimes);
      } else {
        setBlockedTimes([]);
      }
    } catch (error) {
      console.error('❌ Error fetching blocked times:', error);
    }
  };

  const fetchScheduleLabels = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/schedule/labels`);
      setScheduleLabels(
        (response.data.labels || []).map((item) => ({
          ...item,
          date: String(item.date).split('T')[0],
          time: item.time ? String(item.time).slice(0, 5) : '',
        }))
      );
    } catch (error) {
      console.error('Error fetching schedule labels:', error);
    }
  };

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${selectedDate.getFullYear()}/US`);
        const data = await response.json();
        const formatted = data.map((holiday) => ({
          date: holiday.date,
          name: holiday.localName,
        }));
        setHolidays(formatted);
      } catch (error) {
        console.error('❌ Failed to fetch holidays:', error);
      }
    };

    fetchHolidays();
  }, [selectedDate]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [gigsRes, appointmentsRes, clientsRes, eventsRes, tasksRes] = await Promise.all([
          axios.get(`${apiUrl}/gigs`),
          axios.get(`${apiUrl}/appointments`),
          axios.get(`${apiUrl}/api/clients`),
          axios.get(`${apiUrl}/api/events/calendar`),
          axios.get(`${apiUrl}/tasks`),
        ]);

        setGigs(gigsRes.data || []);

        const processedAppointments = (appointmentsRes.data || []).map((appointment) => ({
          ...appointment,
          date: toDateKey(appointment.date),
        }));

        const processedEvents = (eventsRes.data || []).map((event) => ({
          ...event,
          date: toLocalTimestampDateKey(event.start_time || event.date),
        }));

        setAppointments(processedAppointments);
        setClients(clientsRes.data || []);
        setEvents(processedEvents);
        setTasks((tasksRes.data || []).map((task) => ({ ...task, due_date: toDateKey(task.due_date) })));

        fetchBlockedTimes();
        fetchScheduleLabels();
      } catch (error) {
        console.error('❌ Error fetching data:', error);
        setStatus({ type: 'error', message: 'The schedule could not be loaded. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${apiUrl}/users`);
        setUsers(res.data || []);
      } catch (error) {
        console.error('❌ Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [apiUrl]);

  const formatTime = (time) => {
    if (!time) return '';
    let formattedTime = time.length === 1 ? `0${time}:00` : `${time}`;
    if (!formattedTime.includes(':')) formattedTime = `${formattedTime}:00`;

    const date = new Date();
    const [hours, minutes] = formattedTime.split(':');
    date.setHours(hours, minutes);

    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  const handleDateClick = (date) => setSelectedDate(date);

  const handleAddOrUpdateAppointment = (e) => {
    e.preventDefault();

    const clientId = parseInt(newAppointment.client, 10);
    const selectedClient = clients.find((c) => c.id === clientId) || {};

    if (!clientId) {
      alert('❌ Please select a client.');
      return;
    }

    if (!newAppointment.date || !newAppointment.time || !newAppointment.endTime) {
      setStatus({ type: 'error', message: 'Date, start time, and end time are required.' });
      return;
    }
    if (newAppointment.endTime <= newAppointment.time) {
      setStatus({ type: 'error', message: 'End time must be later than start time.' });
      return;
    }

    const hasConflict = appointments.some((appointment) =>
      appointment.id !== editingAppointment?.id &&
      toDateKey(appointment.date) === newAppointment.date &&
      newAppointment.time < String(appointment.end_time).slice(0, 5) &&
      newAppointment.endTime > String(appointment.time).slice(0, 5)
    );
    if (hasConflict && !window.confirm('This time overlaps another appointment. Save it anyway?')) return;

    let adjustedTitle = newAppointment.title;
    let totalCost = newAppointment.price || 0;

    if (newAppointment.title.toLowerCase().includes('bar course')) {
      const existingCount = appointments.filter(
        (a) =>
          a.client_id === parseInt(newAppointment.client) &&
          a.title?.toLowerCase().includes('bar course')
      ).length;

      if (existingCount === 0) {
        adjustedTitle = 'Bar Course (Main)';
        totalCost = 399;
      } else {
        adjustedTitle = 'Bar Course (Session)';
        totalCost = 0;
      }
    }

    const appointmentData = {
      title: adjustedTitle,
      client_id: clientId,
      client_name: selectedClient?.full_name || 'Unknown',
      client_email: selectedClient?.email || 'Unknown',
      date: newAppointment.date,
      time: newAppointment.time,
      end_time: newAppointment.endTime,
      description: newAppointment.description,
      assigned_staff: newAppointment.assigned_staff,
      isAdmin: true,
      total_cost: totalCost,
    };

    if (editingAppointment) {
      axios
        .patch(`${apiUrl}/appointments/${editingAppointment.id}`, {
          ...appointmentData,
          notifyClient,
        })
        .then((res) => {
          alert('✅ Appointment updated successfully!');
          setAppointments((prev) =>
            prev.map((appt) => (appt.id === editingAppointment.id ? res.data : appt))
          );
          setEditingAppointment(null);
          setNewAppointment({
            title: '',
            client: '',
            date: '',
            time: '',
            endTime: '',
            description: '',
            assigned_staff: ['Lyn'],
            recurrence: '',
            occurrences: 1,
            weekdays: [],
          });
          setShowAppointmentModal(false);
          setNotifyClient(false);
          setStatus({
            type: 'success',
            message: res.data.notificationSent ? 'Appointment updated and the client was notified.' : 'Appointment updated without emailing the client.',
          });
        })
        .catch((err) => {
          console.error('❌ Error updating appointment:', err);
          alert('Error updating appointment.');
        });
    } else {
      axios
        .post(`${apiUrl}/appointments`, appointmentData)
        .then((res) => {
          alert('✅ Appointment added successfully!');
          setAppointments([...appointments, res.data]);
          setNewAppointment({
            title: '',
            client: '',
            date: '',
            time: '',
            endTime: '',
            description: '',
            assigned_staff: ['Lyn'],
            recurrence: '',
            occurrences: 1,
            weekdays: [],
          });
          setShowAppointmentModal(false);
        })
        .catch((err) => {
          console.error('❌ Error adding appointment:', err);
          alert('Error adding appointment.');
        });
    }
  };

  const generateRecurringBlockedTimes = () => {
    const blocked = [];
    const [startHour, startMinute] = blockStartTime.split(':').map(Number);
    const startDate = new Date(blockDate);

    for (let week = 0; week < recurrenceWeeks; week++) {
      recurringDays.forEach((dayIndex) => {
        const startOfWeek = new Date(startDate);
        startOfWeek.setDate(startDate.getDate() - startDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const current = new Date(startOfWeek);
        current.setDate(startOfWeek.getDate() + dayIndex + week * 7);

        const isoDate = toDateKey(current);
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute
          .toString()
          .padStart(2, '0')}`;

        blocked.push({
          timeSlot: `${isoDate}-${startTime}`,
          label: `${blockLabel} (${blockDuration} hours)`,
          date: isoDate,
          duration: blockDuration,
        });
      });
    }

    return blocked;
  };

  const handleDrop = async (e, newDate, newHour) => {
    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (!appointmentId) return;

    try {
      const appt = appointments.find((a) => a.id === parseInt(appointmentId, 10));
      if (!appt) return;

      const formattedNewTime = `${newHour.toString().padStart(2, '0')}:00`;

      const oldStart = new Date(`${appt.date}T${appt.time}`);
      const oldEnd = new Date(`${appt.date}T${appt.end_time}`);
      const durationMinutes = (oldEnd - oldStart) / (1000 * 60);

      const newStart = new Date(`${newDate}T${formattedNewTime}`);
      const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

      const endHours = newEnd.getHours().toString().padStart(2, '0');
      const endMinutes = newEnd.getMinutes().toString().padStart(2, '0');
      const formattedNewEndTime = `${endHours}:${endMinutes}`;

      if (toDateKey(appt.date) === newDate && String(appt.time).slice(0, 5) === formattedNewTime) return;

      setPendingMove({
        appointment: appt,
        oldDate: toDateKey(appt.date),
        oldTime: String(appt.time).slice(0, 5),
        newDate,
        newTime: formattedNewTime,
        newEndTime: formattedNewEndTime,
      });
    } catch (error) {
      console.error('Error moving appointment:', error);
      alert('Error moving appointment.');
    }
  };

  const handleBlockTime = async () => {
    if (!blockDate || !blockStartTime || !blockDuration || !blockLabel || recurringDays.length === 0) {
      alert('⚠️ Please fill in all fields and select at least one day.');
      return;
    }

    const blockedTimesArray = generateRecurringBlockedTimes();

    try {
      if (editingBlockedTime) {
        await axios.delete(`${apiUrl}/api/schedule/block`, {
          data: { timeSlot: editingBlockedTime.timeSlot, date: editingBlockedTime.date },
        });
      }
      const response = await axios.post(`${apiUrl}/api/schedule/block`, {
        blockedTimes: blockedTimesArray,
      });

      if (response.data.success) {
        await fetchBlockedTimes();
      }

      setShowBlockModal(false);
      setStatus({ type: 'success', message: editingBlockedTime ? 'Blocked time updated.' : 'Time blocked successfully.' });
      setEditingBlockedTime(null);
      setBlockDate('');
      setBlockStartTime('');
      setBlockDuration(1);
      setBlockLabel('');
      setRecurringDays([]);
      setRecurrenceWeeks(1);
    } catch (error) {
      console.error('❌ Error posting blocked times:', error);
    }
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setNotifyClient(false);
    setNewAppointment({
      title: appointment.title,
      client: appointment.client_id,
      date: toDateKey(appointment.date),
      time: appointment.time,
      endTime: appointment.end_time,
      description: appointment.description,
      assigned_staff: appointment.assigned_staff || ['Lyn'],
      recurrence: '',
      occurrences: 1,
      weekdays: [],
    });
    setShowAppointmentModal(true);
  };

  const handleDeleteAppointment = (appointmentId) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      axios
        .delete(`${apiUrl}/appointments/${appointmentId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then(() => {
          alert('Appointment deleted successfully!');
          setAppointments((prev) => prev.filter((appt) => appt.id !== appointmentId));
        })
        .catch((err) => {
          console.error(err);
          alert('Error deleting appointment.');
        });
    }
  };

  const handleDeleteBlockedTime = async (blocked) => {
    if (
      window.confirm(
        `Are you sure you want to remove the blocked time at ${formatTime(
          blocked.timeSlot.split('-').pop()
        )}?`
      )
    ) {
      try {
        await axios.delete(`${apiUrl}/api/schedule/block`, {
          data: { timeSlot: blocked.timeSlot, date: blocked.date },
        });

        setBlockedTimes((prev) =>
          prev.filter((bt) => !(bt.timeSlot === blocked.timeSlot && bt.date === blocked.date))
        );
      } catch (error) {
        console.error('❌ Error deleting blocked time:', error);
        alert('Failed to delete blocked time.');
      }
    }
  };

  const handleEditBlockedTime = (blocked) => {
    const time = blocked.timeSlot.split('-').pop().slice(0, 5);
    const durationMatch = blocked.label.match(/\((\d+(?:\.\d+)?)\s*hours?\)/i);
    const cleanLabel = blocked.label.replace(/\s*\(\d+(?:\.\d+)?\s*hours?\)\s*$/i, '');
    const date = new Date(`${blocked.date}T12:00:00`);
    setEditingBlockedTime(blocked);
    setBlockDate(blocked.date);
    setBlockStartTime(time);
    setBlockDuration(durationMatch ? Number(durationMatch[1]) : 1);
    setBlockLabel(cleanLabel || 'Blocked');
    setRecurringDays([date.getDay()]);
    setRecurrenceWeeks(1);
    setShowBlockModal(true);
  };

  const confirmAppointmentMove = async (shouldNotify) => {
    if (!pendingMove) return;
    const { appointment, newDate, newTime, newEndTime } = pendingMove;
    try {
      const response = await axios.patch(`${apiUrl}/appointments/${appointment.id}`, {
        title: appointment.title,
        description: appointment.description,
        date: newDate,
        time: newTime,
        end_time: newEndTime,
        client_id: appointment.client_id,
        assigned_staff: appointment.assigned_staff,
        notifyClient: shouldNotify,
      });
      setAppointments((current) => current.map((item) =>
        item.id === appointment.id ? { ...response.data, date: toDateKey(response.data.date) } : item
      ));
      setSelectedDate(new Date(`${newDate}T12:00:00`));
      setStatus({
        type: 'success',
        message: response.data.notificationSent ? 'Appointment moved and the client was notified.' : 'Appointment moved without emailing the client.',
      });
      setPendingMove(null);
    } catch (error) {
      console.error('Error moving appointment:', error);
      setStatus({ type: 'error', message: 'The appointment could not be moved.' });
    }
  };

  const handleAddScheduleLabel = async (e) => {
    e.preventDefault();
    const label = newLabel.label.trim();
    if (!newLabel.date || !label) return;

    try {
      const payload = {
        date: newLabel.date,
        time: newLabel.time || null,
        label,
      };
      const response = editingLabelId
        ? await axios.patch(`${apiUrl}/api/schedule/labels/${editingLabelId}`, payload)
        : await axios.post(`${apiUrl}/api/schedule/labels`, payload);
      const saved = response.data.label;
      const normalized = {
        ...saved,
        date: toDateKey(saved.date),
        time: saved.time ? String(saved.time).slice(0, 5) : '',
      };
      setScheduleLabels((prev) => editingLabelId
        ? prev.map((item) => item.id === editingLabelId ? normalized : item)
        : [...prev, normalized]
      );
      setShowLabelModal(false);
      setEditingLabelId(null);
      setNewLabel({ date: '', time: '', label: '' });
      setStatus({ type: 'success', message: editingLabelId ? 'Day label updated.' : 'Day label added.' });
    } catch (error) {
      console.error('Error adding schedule label:', error);
      alert(error.response?.data?.error || 'Failed to add the calendar label.');
    }
  };

  const handleDeleteScheduleLabel = async (id) => {
    if (!window.confirm('Remove this calendar label?')) return;
    try {
      await axios.delete(`${apiUrl}/api/schedule/labels/${id}`);
      setScheduleLabels((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting schedule label:', error);
      alert('Failed to remove the calendar label.');
    }
  };

  const toggleDueTask = async (task) => {
    try {
      const response = await axios.patch(`${apiUrl}/tasks/${task.id}`, { completed: !task.completed });
      setTasks((current) => current.map((item) => item.id === task.id ? response.data : item));
      setStatus({ type: 'success', message: response.data.completed ? 'Task marked complete.' : 'Task reopened.' });
    } catch (error) {
      console.error('Error updating scheduled task:', error);
      setStatus({ type: 'error', message: 'The task could not be updated.' });
    }
  };

  const getTileContent = ({ date }) => {
    const formatDate = toDateKey;
    const calendarDate = formatDate(date);

    const gigsOnDate = (filters.gigs ? gigs : []).filter((gig) => formatDate(gig.date) === calendarDate);
    const appointmentsOnDate = (filters.appointments ? appointments : []).filter(
      (appointment) => formatDate(appointment.date) === calendarDate
    );
    const eventsOnDate = (filters.events ? events : []).filter((event) => formatDate(event.date) === calendarDate);
    const labelsOnDate = scheduleLabels.filter((item) => item.date === calendarDate);
    const tasksOnDate = (filters.tasks ? tasks : []).filter(
      (task) => !task.completed && task.due_date === calendarDate
    );

    return (
      <div>
        {gigsOnDate.length > 0 && <span style={{ color: 'blue', display: 'block' }}>{gigsOnDate.length} Gig(s)</span>}
        {appointmentsOnDate.length > 0 && (
          <span style={{ color: 'purple', display: 'block' }}>{appointmentsOnDate.length} Appointment(s)</span>
        )}
        {eventsOnDate.length > 0 && (
          <span style={{ color: '#1abc9c', display: 'block' }}>{eventsOnDate.length} Event(s)</span>
        )}
        {tasksOnDate.length > 0 && (
          <span className="schedule-task-tile">{tasksOnDate.length} Task{tasksOnDate.length === 1 ? '' : 's'} Due</span>
        )}
        {labelsOnDate.slice(0, 2).map((item) => (
          <span key={item.id} className="schedule-label-tile" title={item.label}>
            {item.time ? `${formatTime(item.time)} ` : ''}{item.label}
          </span>
        ))}
        {labelsOnDate.length > 2 && (
          <span className="schedule-label-more">+{labelsOnDate.length - 2} more</span>
        )}
      </div>
    );
  };

  const goToPreviousWeek = () => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const weekView = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const hours = Array.from({ length: 15 }, (_, i) => i + 9).concat(0);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    const formatHour = (hour) => {
      const period = hour < 12 ? 'AM' : 'PM';
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${formattedHour}:00 ${period}`;
    };

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-CA');
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    return (
      <div className="week-view">
        <div className="scheduler-week-range">{`Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}</div>

        <table>
          <thead>
            <tr>
              <th>Time</th>
              {weekDates.map((date, i) => (
                <th
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    <br />
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {scheduleLabels
                      .filter((item) => item.date === toDateKey(date))
                      .map((item) => (
                        <div key={item.id} className="schedule-label-week" title={item.label}>
                          {item.time ? `${formatTime(item.time)} ` : ''}{item.label}
                        </div>
                      ))}
                    {(filters.tasks ? tasks : [])
                      .filter((task) => !task.completed && task.due_date === toDateKey(date))
                      .map((task) => (
                        <div key={`task-${task.id}`} className="schedule-task-week" title={task.text}>
                          Task: {task.text}
                        </div>
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <td>{formatHour(hour)}</td>

                {weekDates.map((date, dayIndex) => {
                  const dayString = toDateKey(date);
                  const holiday = holidays.find((h) => h.date === dayString);

                  const appointmentsAtTime = (filters.appointments ? appointments : []).filter((appointment) => {
                    const normalizedDate = toDateKey(appointment.date);
                    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
                    const currentSlotStart = new Date(date);
                    currentSlotStart.setHours(hour, 0, 0, 0);
                    const currentSlotEnd = new Date(date);
                    currentSlotEnd.setHours(hour + 1, 0, 0, 0);

                    return (
                      normalizedDate === dayString &&
                      appointmentDateTime >= currentSlotStart &&
                      appointmentDateTime < currentSlotEnd
                    );
                  });

                  const gigsAtTime = (filters.gigs ? gigs : []).filter((gig) => {
                    const normalizedDate = toDateKey(gig.date);
                    const [gigHour] = String(gig.time).split(':').map(Number);
                    return normalizedDate === dayString && gigHour === hour;
                  });

                  const eventsAtTime = (filters.events ? events : []).filter((event) => {
                    const normalizedDate = toLocalTimestampDateKey(event.start_time || event.date);

                    const eventStart = new Date(event.start_time);
                    const currentSlotStart = new Date(date);
                    currentSlotStart.setHours(hour, 0, 0, 0);
                    const currentSlotEnd = new Date(date);
                    currentSlotEnd.setHours(hour + 1, 0, 0, 0);

                    return (
                      normalizedDate === dayString &&
                      eventStart >= currentSlotStart &&
                      eventStart < currentSlotEnd
                    );
                  });

                  const blockedEntriesAtTime = (filters.blocks ? blockedTimes : [])
                    .map((b) => {
                      const [startHour, startMinutes] = b.timeSlot
                        .split('-')
                        .pop()
                        .split(':')
                        .map(Number);

                      const durationMatch = b.label.match(/\((\d+(\.\d+)?)\s*hours?\)/i);
                      const duration = durationMatch ? parseFloat(durationMatch[1]) : 1;

                      return {
                        ...b,
                        startHour,
                        startMinutes: startMinutes || 0,
                        duration,
                      };
                    })
                    .filter((b) => b.date === dayString && b.startHour === hour);

                  return (
                    <td
                      key={dayIndex}
                      className="time-slot"
                      style={{
                        position: 'relative',
                        verticalAlign: 'top',
                        height: '60px',
                      }}
                      onClick={(e) => {
                        const tag = e.target.tagName.toLowerCase();
                        if (['input', 'button', 'label'].includes(tag)) return;

                        setNewAppointment({
                          title: '',
                          client: '',
                          date: dayString,
                          time: `${hour.toString().padStart(2, '0')}:00`,
                          endTime: '',
                          description: '',
                          assigned_staff: ['Lyn'],
                          recurrence: '',
                          occurrences: 1,
                          weekdays: [],
                        });
                        setEditingAppointment(null);
                        setShowAppointmentModal(true);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, dayString, hour)}
                    >
                      {blockedEntriesAtTime.map((blocked, index) => {
                        const [, startMinutes] = blocked.timeSlot
                          .split('-')
                          .pop()
                          .split(':')
                          .map(Number);

                        const blockTop = (startMinutes / 60) * 100;
                        const blockHeight = blocked.duration * 100;

                        return (
                          <div
                            key={index}
                            className="blocked-indicator"
                            style={{
                              position: 'absolute',
                              top: `${blockTop}%`,
                              left: 0,
                              right: 0,
                              height: `${blockHeight}%`,
                              backgroundColor: '#d3d3d3',
                              textAlign: 'center',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1,
                            }}
                          >
                            {blocked.label || 'Blocked'}
                          </div>
                        );
                      })}

                      {currentDay === dayString && currentHour === hour && (
                        <div
                          style={{
                            position: 'absolute',
                            top: `${(currentMinutes / 60) * 100}%`,
                            left: 0,
                            right: 0,
                            height: '2px',
                            backgroundColor: 'red',
                            zIndex: 10,
                          }}
                        />
                      )}

                      <div>
                        {appointmentsAtTime.map((appointment, index) => {
                          const startTime = new Date(`${appointment.date}T${appointment.time}`);
                          const endTime = new Date(`${appointment.date}T${appointment.end_time}`);
                          const durationInMinutes = (endTime - startTime) / (1000 * 60);
                          const startMinutes = startTime.getMinutes();
                          const topPercentage = (startMinutes / 60) * 100;

                          return (
                            <div
                              key={appointment.id}
                              className={`event appointment ${index > 0 ? 'overlapping' : ''}`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('appointmentId', appointment.id);
                              }}
                              style={{
                                position: 'absolute',
                                top: `${topPercentage}%`,
                                height: `${(durationInMinutes / 60) * 100}%`,
                                padding: '2px',
                                zIndex: 2,
                              }}
                            >
                              {clients.find((c) => c.id === appointment.client_id)?.full_name || 'Unknown'} -{' '}
                              {appointment.title}
                            </div>
                          );
                        })}

                        {gigsAtTime.map((gig, index) => {
                          const startTime = new Date(`${gig.date}T${gig.time}`);
                          const durationInMinutes = (gig.duration || 1) * 60;
                          const startMinutes = startTime.getMinutes();
                          const topPercentage = (startMinutes / 60) * 100;

                          return (
                            <div
                              key={gig.id}
                              className={`event gig ${index > 0 ? 'overlapping' : ''}`}
                              style={{
                                position: 'absolute',
                                top: `${topPercentage}%`,
                                height: `${(durationInMinutes / 60) * 100}%`,
                                padding: '2px',
                                zIndex: 2,
                              }}
                            >
                              {gig.client} - {gig.event_type}
                            </div>
                          );
                        })}

                        {eventsAtTime.map((event, index) => {
                          const startTime = new Date(event.start_time);
                          const endTime = new Date(event.end_time);
                          const durationInMinutes = Math.max(
                            30,
                            (endTime - startTime) / (1000 * 60)
                          );
                          const startMinutes = startTime.getMinutes();
                          const topPercentage = (startMinutes / 60) * 100;

                          return (
                            <div
                              key={`event-${event.id}`}
                              className={`event ${index > 0 ? 'overlapping' : ''}`}
                              style={{
                                position: 'absolute',
                                top: `${topPercentage}%`,
                                height: `${(durationInMinutes / 60) * 100}%`,
                                padding: '2px',
                                background: '#1abc9c',
                                color: '#fff',
                                borderRadius: '4px',
                                fontSize: '12px',
                                zIndex: 2,
                              }}
                              title={`${event.title} • ${formatTime(
                                String(startTime.getHours()).padStart(2, '0') +
                                  ':' +
                                  String(startTime.getMinutes()).padStart(2, '0')
                              )}`}
                            >
                              🎉 {event.title}
                            </div>
                          );
                        })}

                        {hour === 9 && holiday && (
                          <div
                            style={{
                              backgroundColor: '#ffe6e6',
                              color: '#990000',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              padding: '2px',
                              position: 'relative',
                              zIndex: 3,
                            }}
                          >
                            🎉 {holiday.name}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="scheduler-page">
      <header className="scheduler-header">
        <div>
          <h1>Schedule</h1>
          <p>Appointments, gigs, events, and availability in one place.</p>
        </div>
        <button className="scheduler-primary-action" onClick={() => setShowPlusOptionsModal(true)}>
          <Plus size={18} /> Add
        </button>
      </header>

      {status.message && (
        <div className={`scheduler-status ${status.type}`} role="status">
          <span>{status.message}</span>
          <button onClick={() => setStatus({ type: '', message: '' })} aria-label="Dismiss message"><X size={16} /></button>
        </div>
      )}

      <div className="scheduler-toolbar">
        <div className="scheduler-date-nav">
          <button onClick={() => setSelectedDate(new Date())}>Today</button>
          <button onClick={goToPreviousWeek} aria-label="Previous week"><ChevronLeft size={18} /></button>
          <button onClick={goToNextWeek} aria-label="Next week"><ChevronRight size={18} /></button>
          <strong>{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        </div>
        <div className="scheduler-view-switch" aria-label="Calendar view">
          <button className={!isWeekView ? 'active' : ''} onClick={() => setIsWeekView(false)}><CalendarDays size={16} /> Month</button>
          <button className={isWeekView ? 'active' : ''} onClick={() => setIsWeekView(true)}><Clock3 size={16} /> Week</button>
        </div>
      </div>

      <div className="scheduler-filters">
        <Filter size={16} />
        {[
          ['appointments', 'Appointments'], ['gigs', 'Gigs'], ['events', 'Events'], ['blocks', 'Blocked'], ['tasks', 'Tasks Due'],
        ].map(([key, label]) => (
          <label key={key} className={`scheduler-filter ${key}`}>
            <input
              type="checkbox"
              checked={filters[key]}
              onChange={() => setFilters((current) => ({ ...current, [key]: !current[key] }))}
            />
            {label}
          </label>
        ))}
      </div>

      {isLoading && <div className="scheduler-loading">Loading schedule...</div>}

      {isWeekView ? (
        weekView()
      ) : (
        <Calendar onClickDay={handleDateClick} tileContent={getTileContent} value={selectedDate} />
      )}

      <section className="scheduler-agenda">
      <div className="scheduler-agenda-heading">
        <div><span>Daily agenda</span><h2>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2></div>
        <button onClick={() => setShowPlusOptionsModal(true)}><Plus size={16} /> Add to this day</button>
      </div>

      <div className="schedule-label-list">
        {scheduleLabels
          .filter((item) => item.date === toDateKey(selectedDate))
          .map((item) => (
            <div key={item.id} className="schedule-label-card">
              <div>
                <strong>{item.label}</strong>
                {item.time && <span>{formatTime(item.time)}</span>}
              </div>
              <div className="scheduler-item-actions">
                <button onClick={() => { setEditingLabelId(item.id); setNewLabel({ date: item.date, time: item.time || '', label: item.label }); setShowLabelModal(true); }} aria-label={`Edit ${item.label}`}><Edit3 size={16} /></button>
                <button onClick={() => handleDeleteScheduleLabel(item.id)} aria-label={`Delete ${item.label}`}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
      </div>

      {filters.tasks && (
        <div className="scheduler-task-list">
          {tasks
            .filter((task) => task.due_date === toDateKey(selectedDate))
            .map((task) => (
              <label key={task.id} className={`scheduler-task-card ${task.completed ? 'completed' : ''}`}>
                <input type="checkbox" checked={Boolean(task.completed)} onChange={() => toggleDueTask(task)} />
                <span>
                  <strong>{task.text}</strong>
                  <small>{task.category || 'Unassigned'} · {task.priority || 'No priority'}</small>
                </span>
              </label>
            ))}
        </div>
      )}

      <div className="gig-container">
        {(filters.gigs ? gigs : [])
          .filter((gig) => {
            return toDateKey(gig.date) === toDateKey(selectedDate);
          })
          .map((gig) => (
            <div key={gig.id} className="gig-card">
              <strong>Client:</strong> {gig.client} <br />
              <strong>Event:</strong> {gig.event_type} <br />
              <strong>Time:</strong> {formatTime(gig.time)} <br />
              <strong>Location:</strong> {gig.location}
            </div>
          ))}
      </div>

      <div className="appointment-container">
        {(filters.appointments ? appointments : [])
          .filter((appointment) => {
            return toDateKey(appointment.date) === toDateKey(selectedDate);
          })
          .map((appointment) => (
            <div key={appointment.id} className="gig-card">
              <strong>Title:</strong> {appointment.title} <br />
              <strong>Client:</strong>{' '}
              {clients?.length > 0 && appointment.client_id
                ? clients.find((client) => client.id === appointment.client_id)?.full_name || 'N/A'
                : 'N/A'}{' '}
              <br />
              <strong>Time:</strong> {formatTime(appointment.time)} - {formatTime(appointment.end_time)}{' '}
              <br />
              <strong>Description:</strong>
              <div style={{ whiteSpace: 'pre-line' }}>{appointment.description}</div>
              <br />
              <strong>Staff:</strong> {appointment.assigned_staff} <br />
              <br />
              <strong>Total:</strong> ${Number(appointment.price || 0).toFixed(2)}
              <br />
              <strong>Paid:</strong> ${Number(appointment.client_payment || 0).toFixed(2)}
              <br />
              <strong>Remaining:</strong> ${Math.max(0, Number(appointment.price || 0) - Number(appointment.client_payment || 0)).toFixed(2)}
              <br />
              <button onClick={() => handleEditAppointment(appointment)}>Edit</button>
              <button onClick={() => handleDeleteAppointment(appointment.id)}>Delete</button>
            </div>
          ))}
      </div>

      <div className="gig-container">
        {(filters.events ? events : [])
          .filter((event) => {
            const eventDate = toDateKey(event.date || event.start_time);
            return eventDate === toDateKey(selectedDate);
          })
          .map((event) => (
            <div key={`selected-event-${event.id}`} className="gig-card">
              <strong>Event:</strong> {event.title} <br />
              <strong>Time:</strong>{' '}
              {new Date(event.start_time).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              -{' '}
              {new Date(event.end_time).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
              <br />
              <strong>Location:</strong> {event.location_name || 'N/A'}
            </div>
          ))}
      </div>

      <div className="blocked-time-container">
        {(filters.blocks ? blockedTimes : [])
          .filter((blocked) => {
            const blockedDate = toDateKey(blocked.date);
            const selectedDateFormatted = toDateKey(selectedDate);
            return blockedDate === selectedDateFormatted;
          })
          .map((blocked) => (
            <div key={blocked.timeSlot} className="gig-card blocked">
              <strong>Blocked Time:</strong> {formatTime(blocked.timeSlot.split('-').pop())} <br />
              <strong>Reason:</strong> {blocked.label} <br />
              <button onClick={() => handleEditBlockedTime(blocked)}><Edit3 size={15} /> Edit</button>
              <button onClick={() => handleDeleteBlockedTime(blocked)}><Trash2 size={15} /> Delete</button>
            </div>
          ))}
      </div>
      </section>

      {showBlockModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingBlockedTime ? 'Edit Blocked Time' : 'Block Time Slot'}</h3>

            <label>Select Date:</label>
            <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />

            <label>Start Time:</label>
            <input
              type="time"
              value={blockStartTime}
              onChange={(e) => setBlockStartTime(e.target.value)}
            />

            <label>Duration (Hours):</label>
            <input
              type="number"
              min="1"
              value={blockDuration}
              onChange={(e) => setBlockDuration(Number(e.target.value))}
            />

            <label>Reason:</label>
            <input type="text" value={blockLabel} onChange={(e) => setBlockLabel(e.target.value)} />

            <label>Select Days of the Week:</label>
            <div style={{ marginBottom: '10px' }}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                (day, i) => (
                  <label key={day} style={{ marginRight: '10px' }}>
                    <input
                      type="checkbox"
                      value={i}
                      checked={recurringDays.includes(i)}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setRecurringDays((prev) =>
                          e.target.checked ? [...prev, value] : prev.filter((d) => d !== value)
                        );
                      }}
                    />
                    {day}
                  </label>
                )
              )}
            </div>

            <label>Number of Weeks to Repeat:</label>
            <input
              type="number"
              min="1"
              value={recurrenceWeeks}
              onChange={(e) => setRecurrenceWeeks(Number(e.target.value))}
            />

            <div style={{ marginTop: '20px' }}>
              <button onClick={handleBlockTime}>{editingBlockedTime ? 'Save Changes' : 'Block Time'}</button>
              <button onClick={() => setShowBlockModal(false)} style={{ marginLeft: '10px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlusOptionsModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>What would you like to do?</h3>
            <button
              onClick={() => {
                setShowPlusOptionsModal(false);
                setShowAppointmentModal(true);
                setEditingAppointment(null);
                setNotifyClient(false);
                setNewAppointment({
                  title: '',
                  client: '',
                  date: toDateKey(selectedDate),
                  time: '',
                  endTime: '',
                  description: '',
                  assigned_staff: ['Lyn'],
                  recurrence: '',
                  occurrences: 1,
                  weekdays: [],
                });
              }}
            >
              ➕ Add Appointment
            </button>

            <button
              style={{ marginTop: '10px' }}
              onClick={() => {
                setShowPlusOptionsModal(false);
                setShowBlockModal(true);
              }}
            >
              🚫 Block Time
            </button>

            <button
              style={{ marginTop: '10px' }}
              onClick={() => {
                setShowPlusOptionsModal(false);
                setNewLabel({
                  date: toDateKey(selectedDate),
                  time: '',
                  label: '',
                });
                setShowLabelModal(true);
              }}
            >
              Add Day Label
            </button>

            <button
              style={{ marginTop: '20px', color: 'gray' }}
              onClick={() => setShowPlusOptionsModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showLabelModal && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={editingLabelId ? 'Edit day label' : 'Add day label'}>
          <div className="modal-content scheduler-modal">
            <button className="scheduler-modal-close" onClick={() => { setShowLabelModal(false); setEditingLabelId(null); }} aria-label="Close"><X size={20} /></button>
            <h3>{editingLabelId ? 'Edit Day Label' : 'Add Day Label'}</h3>
            <form onSubmit={handleAddScheduleLabel}>
              <label>
                Date:
                <input
                  type="date"
                  value={newLabel.date}
                  onChange={(e) => setNewLabel({ ...newLabel, date: e.target.value })}
                  required
                />
              </label>
              <label>
                Time (optional):
                <input
                  type="time"
                  value={newLabel.time}
                  onChange={(e) => setNewLabel({ ...newLabel, time: e.target.value })}
                />
              </label>
              <label>
                Label:
                <input
                  type="text"
                  maxLength="200"
                  placeholder="Warriors game"
                  value={newLabel.label}
                  onChange={(e) => setNewLabel({ ...newLabel, label: e.target.value })}
                  required
                  autoFocus
                />
              </label>
              <div style={{ marginTop: '20px' }}>
                <button type="submit">{editingLabelId ? 'Save Label' : 'Add Label'}</button>
                <button
                  type="button"
                  onClick={() => setShowLabelModal(false)}
                  style={{ marginLeft: '10px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingMove && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Confirm appointment move">
          <div className="modal-content scheduler-modal scheduler-move-review">
            <button className="scheduler-modal-close" onClick={() => setPendingMove(null)} aria-label="Cancel move"><X size={20} /></button>
            <h3>Review Appointment Move</h3>
            <p className="scheduler-move-title">{pendingMove.appointment.title}</p>
            <div className="scheduler-move-comparison">
              <div><span>From</span><strong>{pendingMove.oldDate}</strong><small>{formatTime(pendingMove.oldTime)}</small></div>
              <ChevronRight size={20} />
              <div><span>To</span><strong>{pendingMove.newDate}</strong><small>{formatTime(pendingMove.newTime)} - {formatTime(pendingMove.newEndTime)}</small></div>
            </div>
            <p className="scheduler-notice">Moving is silent by default. Choose the second option only when the client should receive a reschedule email.</p>
            <div className="scheduler-modal-actions">
              <button onClick={() => confirmAppointmentMove(false)}>Move without email</button>
              <button className="secondary" onClick={() => confirmAppointmentMove(true)}>Move and email client</button>
              <button className="quiet" onClick={() => setPendingMove(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAppointmentModal && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={editingAppointment ? 'Edit appointment' : 'Add appointment'}>
          <div className="modal-content scheduler-modal scheduler-appointment-modal">
            <button className="scheduler-modal-close" onClick={() => setShowAppointmentModal(false)} aria-label="Close"><X size={20} /></button>
            <h3>{editingAppointment ? 'Edit Appointment' : 'Add Appointment'}</h3>

            <form onSubmit={handleAddOrUpdateAppointment}>
              <label>
                Title:
                <select
                  value={newAppointment.title}
                  onChange={(e) => {
                    const selectedType = appointmentTypes.find(
                      (type) => type.title === e.target.value
                    );
                    setNewAppointment({
                      ...newAppointment,
                      title: selectedType?.title || '',
                      category: selectedType?.category || '',
                    });
                  }}
                  required
                >
                  <option value="" disabled>
                    Select an Appointment Type
                  </option>
                  {appointmentTypes.map((type, index) => (
                    <option key={index} value={type.title}>
                      {type.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Assign Staff:
                <select
                  multiple
                  value={newAppointment.assigned_staff || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                    setNewAppointment({ ...newAppointment, assigned_staff: selected });
                  }}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.username}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Client:
                <select
                  value={newAppointment.client}
                  onChange={(e) => setNewAppointment({ ...newAppointment, client: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Select a Client
                  </option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date:
                <input
                  type="date"
                  value={newAppointment.date || ''}
                  onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                  required
                />
              </label>

              <label>
                Time:
                  <input
                    type="time"
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                  required
                />
              </label>

              <label>
                End Time:
                <input
                  type="time"
                    value={newAppointment.endTime}
                  onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                    required
                  />
              </label>

              <label>
                Repeat:
                <select
                  value={newAppointment.recurrence || ''}
                  onChange={(e) =>
                    setNewAppointment({ ...newAppointment, recurrence: e.target.value })
                  }
                >
                  <option value="">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>

              {newAppointment.recurrence && (
                <>
                  <label>
                    Occurrences:
                    <input
                      type="number"
                      min="1"
                      value={newAppointment.occurrences || 1}
                      onChange={(e) =>
                        setNewAppointment({
                          ...newAppointment,
                          occurrences: parseInt(e.target.value),
                        })
                      }
                    />
                  </label>

                  {(newAppointment.recurrence === 'weekly' ||
                    newAppointment.recurrence === 'biweekly') && (
                    <div>
                      <label>Select days:</label>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                          (day) => (
                            <label key={day}>
                              <input
                                type="checkbox"
                                checked={newAppointment.weekdays?.includes(day) || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const updated = new Set(newAppointment.weekdays || []);
                                  checked ? updated.add(day) : updated.delete(day);
                                  setNewAppointment({
                                    ...newAppointment,
                                    weekdays: Array.from(updated),
                                  });
                                }}
                              />
                              {day.slice(0, 3)}
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <label>
                Description:
                <textarea
                  value={newAppointment.description}
                  onChange={(e) =>
                    setNewAppointment({ ...newAppointment, description: e.target.value })
                  }
                />
              </label>

              {newAppointment.description && (
                <div style={{ marginTop: 8 }}>
                  <strong>Preview:</strong>
                  <div
                    style={{
                      whiteSpace: 'pre-line',
                      background: '#fafafa',
                      border: '1px solid #eee',
                      padding: 10,
                      borderRadius: 8,
                      marginTop: 6,
                    }}
                  >
                    {newAppointment.description}
                  </div>
                </div>
              )}

              {editingAppointment && (
                <label className="scheduler-notify-choice">
                  <input type="checkbox" checked={notifyClient} onChange={(e) => setNotifyClient(e.target.checked)} />
                  <span><strong>Email the client about this time change</strong><small>Off by default. No email is sent for ordinary edits.</small></span>
                </label>
              )}

              <button type="submit">
                {editingAppointment ? 'Update Appointment' : 'Add Appointment'}
              </button>

              <button
                type="button"
                onClick={() => setShowAppointmentModal(false)}
                style={{ marginLeft: '10px' }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingPage;
