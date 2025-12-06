import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validatePassword = (val) => (val || '').length >= 6;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form (modern UX)
    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setError('');
    if (!email) { setEmailError('Email wajib diisi'); hasError = true; }
    else if (!validateEmail(email)) { setEmailError('Format email tidak valid'); hasError = true; }
    if (!password) { setPasswordError('Password wajib diisi'); hasError = true; }
    else if (!validatePassword(password)) { setPasswordError('Minimal 6 karakter'); hasError = true; }
    if (hasError) return;
    
    try {
      setError('');
      setLoading(true);
      
      // Attempt login
      await login(email, password);
      
      // Redirect to dashboard on success
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Gagal login. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`mt-8 sm:mx-auto sm:w-full sm:max-w-md transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-gray-100 py-8 px-6 sm:px-10">
        <form className="mb-0 space-y-6" onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Login Admin</h1>
          <p className="text-center text-sm text-gray-500 mb-4">Masuk untuk mengelola Catalis Admin Panel</p>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex items-center">
                <FiAlertCircle className="text-red-500 mr-3" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="form-label">Email</label>
            <div className="input-with-icon mt-1">
              <div className="input-icon"><FiMail /></div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
                className="form-input"
                placeholder="admin@example.com"
              />
            </div>
            {emailError && <p className="form-error">{emailError}</p>}
          </div>
          
          <div>
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-with-icon mt-1">
              <div className="input-icon"><FiLock /></div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!passwordError}
                className="form-input"
                placeholder="••••••••"
              />
            </div>
            {passwordError && <p className="form-error">{passwordError}</p>}
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 rounded-full shadow-sm text-sm font-semibold text-dark bg-primary hover:bg-primary-dark transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </>
              ) : (
                'Login'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
