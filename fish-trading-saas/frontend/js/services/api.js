// Simple API service for consistency
window.API = {
  get: async (endpoint) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.location.origin}/api${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('API error');
    return response.json();
  },
  post: async (endpoint, data) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.location.origin}/api${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
