import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import streamService from '../../services/streamService';
import { getAllCategories } from '../../services/productService'; // Assuming categories are shared
import SectionCard from '../../components/common/SectionCard';
import {
  FiArrowLeft, FiUploadCloud, FiX, FiHelpCircle,
  FiCheckSquare, FiAlertCircle, FiVideo, FiEdit3, FiTag, FiEyeOff, FiCalendar
} from 'react-icons/fi';

const CreateStreamPage = () => {
  const initialState = {
    title: '',
    description: '',
    category_id: '',
    is_private: false,
    // status is 'scheduled' by default on backend
    // start_time will be handled by backend if not provided or for "Go Live Now"
  };

  const [formData, setFormData] = useState(initialState);
  const [categories, setCategories] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null); // For file object
  const [thumbnailPreview, setThumbnailPreview] = useState(null); // For data URL

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsFetchingCategories(true);
    getAllCategories()
      .then(data => setCategories(data || []))
      .catch(err => setError('Could not load categories. Please try again later.'))
      .finally(() => setIsFetchingCategories(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit example
        setError('Thumbnail image size should not exceed 2MB.');
        setThumbnailFile(null);
        setThumbnailPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPEG, PNG, GIF, WEBP).');
        setThumbnailFile(null);
        setThumbnailPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleSubmit = async (actionType) => { // e.g., 'schedule', 'go_live_now' (future)
    if (actionType === 'cancel') {
      navigate('/dashboard/streams'); // Or wherever your streams list is
      return;
    }
    if (!formData.title) {
        setError('Stream title is required.');
        return;
    }

    setIsSubmitting(true); setError(null); setSuccess(null);

    const payload = new FormData();
    payload.append('title', formData.title);
    if (formData.description) payload.append('description', formData.description);
    if (formData.category_id) payload.append('category_id', formData.category_id);
    payload.append('is_private', formData.is_private);
    // Backend will set status to 'scheduled' by default
    if (thumbnailFile) {
      payload.append('thumbnail', thumbnailFile); // 'thumbnail' must match multer field name on backend
    }

    try {
      const newStream = await streamService.createStream(payload);
      setSuccess(`Stream "${newStream.title}" scheduled successfully!`);
      setFormData(initialState);
      removeThumbnail();
      // Navigate to the stream list or the new stream's detail/management page
      setTimeout(() => navigate('/dashboard/streams'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to schedule stream.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center gap-2 pt-3">
        <Link to="/dashboard/streams" className="btn btn-ghost btn-sm btn-circle p-0 -ml-1">
          <FiArrowLeft size={24} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-base-content">Schedule a New Stream</h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        <SectionCard title="Stream Details">
          <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><FiVideo />Title*</span></label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g., Weekly Card Break Bonanza!" className="input input-bordered w-full" required disabled={isSubmitting} />
          </div>
          <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><FiEdit3 />Description</span></label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered w-full h-24" placeholder="What's your stream about? (Optional)" disabled={isSubmitting}></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><FiTag />Category</span></label>
              <select name="category_id" value={formData.category_id} onChange={handleChange} className="select select-bordered w-full" disabled={isSubmitting || isFetchingCategories}>
                <option value="">Select a category (Optional)</option>
                {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
              </select>
              {isFetchingCategories && <span className="text-xs text-info mt-1">Loading categories...</span>}
            </div>
            <div className="form-control">
                <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><FiCalendar />Start Time (Optional)</span></label>
                <input type="datetime-local" name="start_time" value={formData.start_time || ''} onChange={handleChange} className="input input-bordered w-full" disabled={isSubmitting} />
                <p className="text-xs text-base-content/60 mt-1">Leave blank to schedule for 'as soon as possible' or if going live immediately.</p>
            </div>
          </div>
           <div className="form-control">
            <label className="label cursor-pointer py-2 justify-start items-center gap-3">
                <input
                    type="checkbox"
                    name="is_private"
                    checked={formData.is_private}
                    onChange={handleChange}
                    className="checkbox checkbox-primary"
                    disabled={isSubmitting}
                />
                <span className="label-text font-medium flex items-center gap-1.5"><FiEyeOff /> Private Stream</span>
            </label>
            <p className="text-xs text-base-content/60 ml-10">If checked, this stream will not be publicly listed and only accessible via a direct link (feature might require further implementation).</p>
          </div>
        </SectionCard>

        <SectionCard title="Stream Thumbnail">
          <div className="flex flex-col items-center gap-4">
            {thumbnailPreview ? (
              <div className="relative group w-full max-w-md aspect-video border border-base-300 rounded-md overflow-hidden shadow-sm">
                <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="absolute top-2 right-2 btn btn-error btn-xs btn-circle opacity-70 group-hover:opacity-100 transition-opacity"
                  title="Remove Thumbnail"
                  disabled={isSubmitting}
                > <FiX size={14}/> </button>
              </div>
            ) : (
              <div className="w-full max-w-md aspect-video bg-base-200 rounded-lg flex items-center justify-center text-base-content/50">
                <FiUploadCloud size={40}/>
                <span className="ml-2">No thumbnail selected</span>
              </div>
            )}
            <label
              htmlFor="stream-thumbnail-upload"
              className="btn btn-outline btn-sm normal-case"
            >
              <FiUploadCloud className="mr-2"/> Upload Thumbnail
              <input
                  ref={fileInputRef}
                  id="stream-thumbnail-upload"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  onChange={handleThumbnailChange}
                  disabled={isSubmitting}
              />
            </label>
             <p className="text-xs text-base-content/60 text-center">Recommended: 16:9 aspect ratio (e.g., 1280x720). Max 2MB.</p>
          </div>
        </SectionCard>

        {error && <div role="alert" className="alert alert-error mt-6 shadow-md"><FiAlertCircle size={20}/><span>{error}</span></div>}
        {success && <div role="alert" className="alert alert-success mt-6 shadow-md"><FiCheckSquare size={20}/><span>{success}</span></div>}
      </form>

      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-base-100 p-3 sm:p-4 border-t border-base-300 flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-3 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.1)] z-20">
        <p className="text-xs text-base-content/60 mr-auto hidden md:flex items-center gap-1">
            <FiHelpCircle size={14}/> Fill required fields (*) to schedule your stream.
        </p>
        <button type="button" onClick={() => handleSubmit('cancel')} className="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto order-2 sm:order-1" disabled={isSubmitting}>Cancel</button>
        {/* Could add a "Go Live Now" button later which sets status to 'live' immediately */}
        <button type="button" onClick={() => handleSubmit('schedule')} className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto order-1 sm:order-3" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : "Schedule Stream"}
        </button>
      </div>
    </div>
  );
};

export default CreateStreamPage;