import React, { useState } from "react";

const UserProfile = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Save profile and password to backend
    setSuccess("Profile updated (not yet implemented)");
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-2">User Profile</h2>
      <div>
        <label className="block mb-1">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input input-bordered w-full" />
      </div>
      <div>
        <label className="block mb-1">Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} className="input input-bordered w-full" />
      </div>
      <div>
        <label className="block mb-1">Change Password</label>
        <input type="password" placeholder="Current password" value={password} onChange={e => setPassword(e.target.value)} className="input input-bordered w-full mb-2" />
        <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input input-bordered w-full" />
      </div>
      {success && <div className="text-green-600">{success}</div>}
      {error && <div className="text-red-600">{error}</div>}
      <button type="submit" className="btn btn-primary">Save</button>
    </form>
  );
};

export default UserProfile;
