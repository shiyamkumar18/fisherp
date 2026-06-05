// AuthEntryScreen.jsx
import React, { useState } from 'react';
import EmailLoginForm from '../components/EmailLoginForm';
import PhoneLoginForm from '../components/PhoneLoginForm';
import GoogleLoginButton from '../components/GoogleLoginButton';

const AuthEntryScreen = () => {
  const [mode, setMode] = useState('entry');

  const handleBack = () => setMode('entry');

  return (
    <div className="auth-entry-screen">
      <div className="logo">FisherP</div>
      <h2>Welcome Back <span role="img" aria-label="wave">👋</span></h2>
      {mode === 'entry' && (
        <>
          <button className="auth-btn" onClick={() => setMode('email')}>Continue with Email</button>
          <button className="auth-btn" onClick={() => setMode('phone')}>Continue with Phone</button>
          <GoogleLoginButton />
          <div className="divider my-6">
            <hr />
          </div>
          <div className="new-user">New user? <button className="link-btn" onClick={() => setMode('email')}>Start Free Trial</button></div>
        </>
      )}
      {mode === 'email' && (
        <div>
          <EmailLoginForm />
          <button className="back-btn" onClick={handleBack}>← Back</button>
        </div>
      )}
      {mode === 'phone' && (
        <div>
          <PhoneLoginForm />
          <button className="back-btn" onClick={handleBack}>← Back</button>
        </div>
      )}
    </div>
  );
};

export default AuthEntryScreen;
