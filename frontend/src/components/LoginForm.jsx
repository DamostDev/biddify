import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import useAuthStore from '/Users/mbp/Documents/biddify/frontend/src/services/authStore.js';

const LoginForm = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore(/* ...selector */);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) {
      clearError();
    }
    // Send the input value explicitly as 'email'
    const credentials = {
      email: emailOrUsername, // <-- SEND AS 'email'
      password: password,
    };
    const result = await login(credentials);
    if (!result.success) {
         console.log("Login component received failure:", result.message);
    } else {
         console.log("Login component received success");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="form-control">
        <input type="text" placeholder="Email or Username" className="input input-bordered input-primary w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={emailOrUsername} onChange={(e) => setEmailOrUsername(e.target.value)} required disabled={isLoading} />
      </div>
      <div className="form-control w-full relative">
        <input type={showPassword ? 'text' : 'password'} placeholder="Password" className="input input-bordered input-primary w-full pr-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-base-content/50 hover:text-primary focus:outline-none" tabIndex={-1} disabled={isLoading}> {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />} </button>
      </div>
      <div className="text-right !mt-1"> <a href="#" className="text-xs link link-secondary font-medium"> Forgot Password? </a> </div>
      {error && <div className="alert alert-error text-xs p-2 !mt-3"> <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> <span>{error}</span> </div>}
      <button type="submit" className={`btn btn-accent w-full !mt-5 rounded-md normal-case text-accent-content ${isLoading ? 'loading' : ''}`} disabled={isLoading}> {isLoading ? '' : 'Log In'} </button>
    </form>
  );
};
export default LoginForm;