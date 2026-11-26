import React from 'react';
import './apiSession';
import { getDiscoveryAttribution } from './discoveryAttribution';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import reportWebVitals from './reportWebVitals';

getDiscoveryAttribution();
document.querySelectorAll("[data-discovery-head], head > title").forEach(node => node.remove());

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
