import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Scheduler = () => {
    useEffect(() => {
        // Dynamically load the Acuity Scheduling script
        const script = document.createElement('script');
        script.src = 'https://embed.acuityscheduling.com/js/embed.js';
        script.type = 'text/javascript';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script); // Clean up script
        };
    }, []);

    return (
        <div className="user-gigs-container">
            {/* Navigation menu */}
            <nav>
                <ul>
                    <li>
                        <Link to="/admin/"> Home</Link> |
                        <Link to="/admin/your-gigs"> Your Gigs</Link> |
                        <Link to="/admin/attendance"> Gig Attendance</Link> |
                        <Link to="/admin/mytasks"> My Tasks</Link> |
                        <Link to="/admin/userlist"> Users List</Link>
                    </li>
                </ul>
            </nav>
            <iframe
                src="https://app.acuityscheduling.com/schedule.php?owner=27924822&calendarID=8007268&ref=embedded_csp"
                title="Schedule Appointment"
                width="100%"
                height="800"
                frameBorder="0"
            ></iframe>
        </div>
    );
};

export default Scheduler;


