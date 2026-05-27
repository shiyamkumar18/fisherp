// LoginPage.jsx
// Modes: email, phone, google
import React, { useState } from 'react';
import EmailLoginForm from '../components/EmailLoginForm';
import PhoneLoginForm from '../components/PhoneLoginForm';
import GoogleLoginButton from '../components/GoogleLoginButton';

const LoginPage = () => {
  const [mode, setMode] = useState('email');

  return (
    <div className="auth-container">
      <div className="auth-modes">
        <button onClick={() => setMode('email')} className={mode === 'email' ? 'active' : ''}>Email</button>
        <button onClick={() => setMode('phone')} className={mode === 'phone' ? 'active' : ''}>Phone</button>
        <button onClick={() => setMode('google')} className={mode === 'google' ? 'active' : ''}>Google</button>
      </div>
      <div className="auth-form">
        {mode === 'email' && <EmailLoginForm />}
        {mode === 'phone' && <PhoneLoginForm />}
        {mode === 'google' && <GoogleLoginButton />}
      </div>
    </div>
  );
};

export default LoginPage;
