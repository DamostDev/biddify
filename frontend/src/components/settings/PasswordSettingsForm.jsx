import React, { useState } from 'react';
import { changeUserPassword } from '../../services/userService';
import { FiLock, FiKey } from 'react-icons/fi';

const PasswordSettingsForm = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (formData.newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await changeUserPassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });
      setSuccess(response.message || 'Password updated successfully!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' }); // Clear form
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold text-base-content flex items-center gap-2">
        <FiLock /> Change Password
      </h2>

      <div className="form-control">
        <label htmlFor="currentPassword" className="label pb-1 pt-0">
          <span className="label-text text-base font-medium flex items-center gap-1"><FiKey /> Current Password</span>
        </label>
        <input
          id="currentPassword" name="currentPassword" type="password"
          value={formData.currentPassword} onChange={handleChange}
          className="input input-bordered w-full"
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-control">
        <label htmlFor="newPassword" className="label pb-1 pt-0">
          <span className="label-text text-base font-medium flex items-center gap-1"><FiLock /> New Password</span>
        </label>
        <input
          id="newPassword" name="newPassword" type="password"
          value={formData.newPassword} onChange={handleChange}
          className="input input-bordered w-full"
          required minLength={8}
          disabled={isLoading}
        />
         <p className="text-xs text-base-content/60 mt-1">Must be at least 8 characters.</p>
      </div>

      <div className="form-control">
        <label htmlFor="confirmPassword" className="label pb-1 pt-0">
          <span className="label-text text-base font-medium flex items-center gap-1"><FiLock /> Confirm New Password</span>
        </label>
        <input
          id="confirmPassword" name="confirmPassword" type="password"
          value={formData.confirmPassword} onChange={handleChange}
          className="input input-bordered w-full"
          required
          disabled={isLoading}
        />
      </div>

      {error && <div role="alert" className="alert alert-error text-sm"><svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{error}</span></div>}
      {success && <div role="alert" className="alert alert-success text-sm"><svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{success}</span></div>}

      <div className="form-control pt-4">
        <button type="submit" className="btn btn-primary btn-md" disabled={isLoading}>
          {isLoading ? <><span className="loading loading-spinner loading-sm"></span> Updating...</> : 'Update Password'}
        </button>
      </div>
    </form>
  );
};

export default PasswordSettingsForm;