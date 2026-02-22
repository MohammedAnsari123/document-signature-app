import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios';

import { GoogleOAuthProvider } from '@react-oauth/google';

// Replace with your actual Google Client ID
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

// Configure default Axios base URL for the backend
axios.defaults.baseURL = 'https://document-signature-app-u1zd.onrender.com';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
