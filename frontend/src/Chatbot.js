import React, { useState } from 'react';

const Chatbot = () => {
    const [question, setQuestion] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAskQuestion = async () => {
        if (!question.trim()) {
            alert('Please enter a question!');
            return;
        }
    
        setLoading(true);
        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/chatbot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question }),
            });
    
            if (!res.ok) {
                throw new Error('Failed to get a response from the chatbot');
            }
    
            const data = await res.json();
            console.log('Received response:', data); // Log response
            setResponse(data.answer || 'No answer provided by chatbot.');
        } catch (error) {
            console.error('Error communicating with chatbot:', error.message);
            setResponse('Sorry, I couldn’t process your question. Please try again later.');
        } finally {
            setLoading(false);
        }
    };
    
    

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2>AI Chatbot</h2>
            <textarea
                rows="3"
                placeholder="Type your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ width: '100%', padding: '10px' }}
            />
            <button onClick={handleAskQuestion} disabled={loading}>
                {loading ? 'Thinking...' : 'Ask Question'}
            </button>
            {response && (
                <div style={{ marginTop: '20px', textAlign: 'left' }}>
                    <h4>Response:</h4>
                    <p>{response}</p>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
