import { usePlaidLink } from 'react-plaid-link';
import { useState, useEffect } from 'react';
import axios from 'axios';

const PlaidLinkButton = () => {
    const [linkToken, setLinkToken] = useState(null);

    useEffect(() => {
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

        const getLinkToken = async () => {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/plaid/create-link-token`, { userId: 'user-123' });
                console.log('✅ Link Token Response:', response.data);
                setLinkToken(response.data.link_token); // Store the link token in state
            } catch (error) {
                console.error('❌ Error fetching link token:', error);
            }
        };

        getLinkToken(); // Fetch link token when the component mounts
    }, []);

    const { open, ready } = usePlaidLink({
        token: linkToken,
        onSuccess: async (public_token) => {
            console.log('✅ Public Token Received:', public_token);
            try {
                const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
                const response = await axios.post(`${API_BASE_URL}/api/plaid/exchange-token`, { public_token });
                console.log('✅ Access Token:', response.data.accessToken);
                alert('Bank account linked successfully!');
            } catch (error) {
                console.error('❌ Error exchanging token:', error);
                alert('Failed to link account.');
            }
        },
    });

    return (
        <button onClick={open} disabled={!ready || !linkToken}>
            Connect Bank Account
        </button>
    );
};

export default PlaidLinkButton;
