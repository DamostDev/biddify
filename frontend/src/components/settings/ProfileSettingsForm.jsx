import React, { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../services/authStore'; // Corrected path
import { updateUserProfile } from '../../services/userService';
import { FiCamera, FiUser, FiMail, FiEdit3, FiInfo } from 'react-icons/fi'; // Icons

const ProfileSettingsForm = ({ currentUser }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '', // Display only
    full_name: '',
    bio: '',
  });
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fileInputRef = useRef(null);
  const loadUser = useAuthStore(state => state.loadUser); // To refresh user data

  useEffect(() => {
    if (currentUser) {
      setFormData({
        username: currentUser.username || '',
        email: currentUser.email || '',
        full_name: currentUser.full_name || '',
        bio: currentUser.bio || '',
      });
      setPreviewImage(currentUser.profile_picture_url || null);
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null); // Clear error on input change
    if (success) setSuccess(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit example
        setError('Image size should not exceed 2MB.');
        setProfilePictureFile(null);
        e.target.value = null; // Reset file input
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPEG, PNG, GIF).');
        setProfilePictureFile(null);
        e.target.value = null; // Reset file input
        return;
      }
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
      setError(null); // Clear error if any
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const payload = new FormData();
    payload.append('username', formData.username);
    // Email is not sent for update based on our current backend plan
    if (formData.full_name || formData.full_name === '') payload.append('full_name', formData.full_name); // Send even if empty to clear
    if (formData.bio || formData.bio === '') payload.append('bio', formData.bio);         // Send even if empty to clear

    if (profilePictureFile) {
      payload.append('profile_picture', profilePictureFile); // Key 'profile_picture' must match multer field name
    }

    try {
      const response = await updateUserProfile(payload);
      setSuccess(response.message || 'Profile updated successfully!');
      await loadUser(); // Refresh user data in the authStore
      if (response.user?.profile_picture_url) { // If backend returns updated user with new URL
          setPreviewImage(response.user.profile_picture_url);
      }
      setProfilePictureFile(null); // Clear the file state
      if (fileInputRef.current) fileInputRef.current.value = null; // Reset file input UI

      setTimeout(() => setSuccess(null), 3000); // Clear success message after 3s
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-base-content flex items-center gap-2">
        <FiUser /> Edit Profile
      </h2>

      {/* Profile Picture */}
      <div className="form-control items-center sm:flex-row sm:items-end sm:gap-6">
        <div className="flex flex-col items-center mb-4 sm:mb-0">
          <label className="label pb-1 pt-0 self-start sm:self-center">
            <span className="label-text text-base font-medium">Profile Picture</span>
          </label>
          <div className="avatar relative group">
            <div className="w-28 h-28 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 bg-base-300">
              <img
                src={previewImage || `https://ui-avatars.com/api/?name=${formData.username.charAt(0) || 'P'}&background=random&color=fff&size=128`}
                alt="Profile Preview"
                className="object-cover w-full h-full"
              />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="absolute bottom-0 right-0 btn btn-xs btn-circle btn-neutral group-hover:opacity-100 opacity-70 transition-opacity"
              aria-label="Change profile picture"
            >
              <FiCamera />
            </button>
            <input
              type="file"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="hidden"
            />
          </div>
        </div>
        <div className="text-xs text-base-content/70 max-w-xs text-center sm:text-left">
          Upload a new photo. Max file size 2MB. Recommended square (e.g. 200x200px).
        </div>
      </div>

      {/* Username */}
      <div className="form-control">
        <label htmlFor="username" className="label pb-1 pt-0">
          <span className="label-text text-base font-medium flex items-center gap-1"><FiUser /> Username</span>
        </label>
        <input
          id="username" name="username" type="text"
          value={formData.username} onChange={handleChange}
          className="input input-bordered w-full"
          required
          disabled={isLoading}
        />
      </div>

      {/* Email */}
      <div className="form-control">
        <label htmlFor="email" className="label pb-1 pt-0">
          <span className="label-text text-base font-medium flex items-center gap-1"><FiMail /> Email</span>
        </label>
        <input
          id="email" name="email" type="email"
          value={formData.email}
          className="input input-bordered w-full bg-base-200/70 !cursor-not-allowed"
          readOnly
          disabled
        />
        <p className="text-xs text-base-content/60 mt-1 flex items-center gap-1"><FiInfo size={12}/> Email cannot be changed.</p>
      </div>

      {/* Full Name */}
      <div className="form-control">
        <label htmlFor="full_name" className="label pb-1 pt-0">
          <span className="label-text text-base font-medium flex items-center gap-1"><FiUser /> Full Name</span>
        </label>
        <input
          id="full_name" name="full_name" type="text"
          value={formData.full_name} onChange={handleChange}
          placeholder="Your full name (optional)"
          className="input input-bordered w-full"
          disabled={isLoading}
        />
      </div>

      {/* Bio */}
      <div className="form-control">
        <label htmlFor="bio" className="label pb-1 pt-0">
          <span className="label-text text-base font-medium flex items-center gap-1"><FiEdit3 /> Bio</span>
        </label>
        <textarea
          id="bio" name="bio"
          value={formData.bio} onChange={handleChange}
          className="textarea textarea-bordered w-full h-28"
          placeholder="Tell us a little about yourself (optional, max 250 characters)"
          maxLength={250}
          disabled={isLoading}
        ></textarea>
      </div>

      {error && <div role="alert" className="alert alert-error text-sm"><svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{error}</span></div>}
      {success && <div role="alert" className="alert alert-success text-sm"><svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{success}</span></div>}

      <div className="form-control pt-4">
        <button type="submit" className="btn btn-primary btn-md" disabled={isLoading}>
          {isLoading ? <><span className="loading loading-spinner loading-sm"></span> Updating...</> : 'Save Profile Changes'}
        </button>
      </div>
    </form>
  );
};

export default ProfileSettingsForm;