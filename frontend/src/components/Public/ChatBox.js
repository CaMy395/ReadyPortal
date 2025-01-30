import React, { useState } from 'react';
import '../../App.css'; // Import styles for the chatbox

const Chatbox = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleChatbox = () => setIsOpen(!isOpen);

    const handleSendQuestion = async () => {
        if (!question.trim()) {
            alert('Please enter a question!');
            return;
        }

        setLoading(true);
        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/chatbot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });

            if (!res.ok) throw new Error('Failed to get a response from the chatbot');
            const data = await res.json();
            setResponse(data.answer);
        } catch (error) {
            console.error('Error communicating with chatbot:', error.message);
            setResponse('Sorry, something went wrong. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chatbox-container">
            <div className={`chatbox ${isOpen ? 'open' : ''}`}>
                <div className="chatbox-header" onClick={toggleChatbox}>
                    {isOpen ? 'Chatbot' : 'Chat with us!'}
                </div>
                {isOpen && (
                    <div className="chatbox-body">
                        <textarea
                            rows="2"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Type your question..."
                        />
                        <button onClick={handleSendQuestion} disabled={loading}>
                            {loading ? 'Thinking...' : 'Send'}
                        </button>
                        {response && (
                            <div className="chatbox-response">
                                <strong>Chatbot:</strong> {response}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chatbox;
