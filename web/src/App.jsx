import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userId = params.get('userId');
    const name = params.get('name');

    if (token) {
      localStorage.setItem('line_token', token);
      localStorage.setItem('line_user_id', userId);
      localStorage.setItem('line_name', name);
      window.history.replaceState({}, '', '/');
    }

    const savedToken = localStorage.getItem('line_token');
    const savedName = localStorage.getItem('line_name');
    if (savedToken && savedName) {
      setUser({ name: decodeURIComponent(savedName) });
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (!user) return <Login />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
