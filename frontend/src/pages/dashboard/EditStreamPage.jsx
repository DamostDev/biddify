import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import streamService from '../../services/streamService';
import { getAllCategories } from '../../services/productService';
import SectionCard from '../../components/common/SectionCard';
import {
  FiArrowLeft, FiUploadCloud, FiX, FiHelpCircle,
  FiCheckSquare, FiAlertCircle, FiVideo, FiEdit3, FiTag, FiEyeOff, FiCalendar, FiTrash2
} from 'react-icons/fi';

const EditStreamPage = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const initialFormState = {
    title: '',
    description: '',
    category_id: '',
    is_private: false,
    status: 'scheduled', // Default status for editing
    start_time: '',
    thumbnail_url_manual: '', // To hold existing URL or new manual URL
  };

  const [formData, setFormData] = useState(initialFormState);
  const [categories, setCategories] = useState([]);
  const [newThumbnailFile, setNewThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null); // Can be existing URL or new preview
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState('');


  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setIsLoadingData(true);
    setIsFetchingCategories(true);
    setError(null); setSuccess(null);

    Promise.all([
      streamService.getStreamDetails(streamId),
      getAllCategories()
    ])
    .then(([streamData, categoryData]) => {
      if (streamData) {
        setFormData({
          title: streamData.title || '',
          description: streamData.description || '',
          category_id: streamData.category_id || '',
          is_private: streamData.is_private || false,
          status: streamData.status || 'scheduled',
          start_time: streamData.start_time ? new Date(streamData.start_time).toISOString().slice(0, 16) : '', // Format for datetime-local
          thumbnail_url_manual: streamData.thumbnail_url || '', // Store manual/existing URL
        });
        setThumbnailPreview(streamData.thumbnail_url || null);
        setExistingThumbnailUrl(streamData.thumbnail_url || '');
      } else {
        setError("Stream not found or could not be loaded.");
      }
      setCategories(categoryData || []);
    })
    .catch(err => {
      setError(err.message || "Failed to load stream data or categories.");
    })
    .finally(() => {
      setIsLoadingData(false);
      setIsFetchingCategories(false);
    });
  }, [streamId]);

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
      if (file.size > 2 * 1024 * 1024) {
        setError('Thumbnail image size should not exceed 2MB.');
        setNewThumbnailFile(null);
        // Don't clear preview if there was an existing one
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        setNewThumbnailFile(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }
      setNewThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result); // Show preview of new file
      };
      reader.readAsDataURL(file);
      setFormData(prev => ({ ...prev, thumbnail_url_manual: '' })); // Clear manual URL if new file is chosen
      setError(null);
    }
  };

  const removeThumbnail = () => {
    setNewThumbnailFile(null);
    setThumbnailPreview(existingThumbnailUrl || null); // Revert to existing or nothing
    setFormData(prev => ({ ...prev, thumbnail_url_manual: existingThumbnailUrl })); // Ensure manual URL is reset
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const clearExistingThumbnailField = () => {
    setFormData(prev => ({ ...prev, thumbnail_url_manual: '' }));
    setThumbnailPreview(null); // Clear preview if manual URL is removed
    setExistingThumbnailUrl(''); // Clear the stored existing URL state
  };


  const handleSubmit = async (actionType) => {
    if (actionType === 'cancel') {
      navigate('/dashboard/streams');
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
    payload.append('status', formData.status); // Send status for update
    if (formData.start_time) payload.append('start_time', new Date(formData.start_time).toISOString());


    if (newThumbnailFile) {
      payload.append('thumbnail', newThumbnailFile); // If new file, send it
    } else if (formData.thumbnail_url_manual !== existingThumbnailUrl) {
      // If newThumbnailFile is null, but thumbnail_url_manual has changed (e.g., cleared or new URL typed)
      // Send the current value of thumbnail_url_manual. If it's empty, backend will handle as null.
      payload.append('thumbnail_url_manual', formData.thumbnail_url_manual || '');
    }
    // If newThumbnailFile is null AND thumbnail_url_manual is unchanged from existing,
    // backend should not touch the thumbnail.

    try {
      const updatedStream = await streamService.updateStream(streamId, payload);
      setSuccess(`Stream "${updatedStream.title}" updated successfully!`);
      // Optionally re-fetch or update local state more granularly
      setExistingThumbnailUrl(updatedStream.thumbnail_url || '');
      setThumbnailPreview(updatedStream.thumbnail_url || null);
      setNewThumbnailFile(null);
      setTimeout(() => navigate('/dashboard/streams'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to update stream.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><span className="loading loading-lg loading-ball text-primary"></span></div>;
  }
  if (error && !formData.title && !isLoadingData) { // Catastrophic load failure
    return <div role="alert" className="alert alert-error m-6 shadow-lg"><FiAlertCircle size={24}/><div><h3 className="font-bold">Error Loading Stream!</h3><div className="text-xs">{error}</div></div> <Link to="/dashboard/streams" className="btn btn-sm btn-neutral">Back to Streams</Link></div>;
  }

  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center gap-2 pt-3">
        <Link to="/dashboard/streams" className="btn btn-ghost btn-sm btn-circle p-0 -ml-1">
          <FiArrowLeft size={24} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-base-content">Edit Stream: <span className="text-primary truncate max-w-xs inline-block">{formData.title || 'Loading...'}</span></h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        <SectionCard title="Stream Details">
          {/* Title, Description, Category, Start Time, is_private (same as CreateStreamPage) */}
          <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><FiVideo />Title*</span></label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Stream Title" className="input input-bordered w-full" required disabled={isSubmitting} />
          </div>
          <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><FiEdit3 />Description</span></label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered w-full h-24" placeholder="Stream Description" disabled={isSubmitting}></textarea>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><FiTag />Category</span></label>
              <select name="category_id" value={formData.category_id} onChange={handleChange} className="select select-bordered w-full" disabled={isSubmitting || isFetchingCategories}>
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
              </select>
               {isFetchingCategories && <span className="text-xs text-info mt-1">Loading categories...</span>}
            </div>
            <div className="form-control">
                <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><FiCalendar />Start Time</span></label>
                <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} className="input input-bordered w-full" disabled={isSubmitting} />
            </div>
          </div>
          <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><FiEyeOff />Private Stream</span></label>
            <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" name="is_private" checked={formData.is_private} onChange={handleChange} className="checkbox checkbox-primary" disabled={isSubmitting}/>
                 <span className="label-text text-sm">Make this stream private (invite-only or unlisted)</span>
            </label>
          </div>
           <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium">Status</span></label>
            <select name="status" value={formData.status} onChange={handleChange} className="select select-bordered w-full" disabled={isSubmitting}>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live (Use with caution, manage via Go Live button preferably)</option>
                <option value="ended">Ended</option>
                <option value="cancelled">Cancelled</option>
            </select>
            {formData.status === 'live' && <p className="text-xs text-warning mt-1">Setting status to 'Live' here only updates the database. Use the 'Go Live' button on the stream page for full LiveKit integration.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Stream Thumbnail">
           <div className="flex flex-col items-center gap-4">
            {thumbnailPreview ? (
              <div className="relative group w-full max-w-md aspect-video border border-base-300 rounded-md overflow-hidden shadow-sm">
                <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeThumbnail} // This now reverts to existing or clears if no existing
                  className="absolute top-2 right-2 btn btn-error btn-xs btn-circle opacity-70 group-hover:opacity-100 transition-opacity"
                  title="Remove/Revert Thumbnail"
                  disabled={isSubmitting}
                > <FiX size={14}/> </button>
              </div>
            ) : (
              <div className="w-full max-w-md aspect-video bg-base-200 rounded-lg flex items-center justify-center text-base-content/50">
                <FiUploadCloud size={40}/>
                <span className="ml-2">No thumbnail uploaded</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-md">
                <label htmlFor="stream-thumbnail-upload" className="btn btn-outline btn-sm normal-case flex-grow">
                  <FiUploadCloud className="mr-2"/> {newThumbnailFile || thumbnailPreview ? 'Change' : 'Upload'} Thumbnail
                </label>
                <input
                    ref={fileInputRef} id="stream-thumbnail-upload" type="file" className="hidden"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={handleThumbnailChange} disabled={isSubmitting}
                />
                { (thumbnailPreview || formData.thumbnail_url_manual) && !newThumbnailFile && /* Show clear if there's an existing/manual URL and no new file chosen */
                    <button type="button" onClick={clearExistingThumbnailField} className="btn btn-ghost btn-xs text-error normal-case" disabled={isSubmitting}>
                        <FiTrash2 className="mr-1"/> Clear Thumbnail URL
                    </button>
                }
            </div>
             <p className="text-xs text-base-content/60 text-center">Recommended: 16:9. Max 2MB. You can also provide an external URL below.</p>
             <div className="form-control w-full max-w-md">
                <label className="label py-1"><span className="label-text text-sm">Or enter Thumbnail URL</span></label>
                <input
                    type="url"
                    name="thumbnail_url_manual"
                    value={formData.thumbnail_url_manual}
                    onChange={(e) => {
                        handleChange(e);
                        setThumbnailPreview(e.target.value || (newThumbnailFile ? URL.createObjectURL(newThumbnailFile) : null)); // Update preview if URL is typed
                        if (e.target.value) setNewThumbnailFile(null); // Clear file if URL is provided
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="input input-bordered input-sm w-full"
                    disabled={isSubmitting}
                />
            </div>
          </div>
        </SectionCard>

        {error && <div role="alert" className="alert alert-error mt-6 shadow-md"><FiAlertCircle size={20}/><span>{error}</span></div>}
        {success && <div role="alert" className="alert alert-success mt-6 shadow-md"><FiCheckSquare size={20}/><span>{success}</span></div>}
      </form>

      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-base-100 p-3 sm:p-4 border-t border-base-300 flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-3 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.1)] z-20">
        <p className="text-xs text-base-content/60 mr-auto hidden md:flex items-center gap-1"><FiHelpCircle size={14}/> Update stream details and save your changes.</p>
        <button type="button" onClick={() => handleSubmit('cancel')} className="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto order-2 sm:order-1" disabled={isSubmitting}>Cancel</button>
        <button type="button" onClick={() => handleSubmit('update')} className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto order-1 sm:order-3" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default EditStreamPage;