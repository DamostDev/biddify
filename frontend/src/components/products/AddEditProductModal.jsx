import React, { useState, useEffect, useRef } from 'react';
import { getAllCategories, createProduct, updateProduct } from '../../services/productService'; // Adjust path
import { FiX, FiImage, FiUploadCloud, FiTrash2 } from 'react-icons/fi';

const AddEditProductModal = ({ isOpen, onClose, productToEdit, onSave }) => {
  const initialState = {
    title: '',
    description: '',
    category_id: '',
    condition: 'good',
    original_price: '',
    is_active: true,
    images: [], // Holds existing image objects { image_id, image_url, is_primary }
  };

  const [formData, setFormData] = useState(initialState);
  const [categories, setCategories] = useState([]);
  const [newImages, setNewImages] = useState([]); // Holds File objects for new uploads
  const [imagePreviews, setImagePreviews] = useState([]); // Holds data URLs for new image previews
  const [imagesToDelete, setImagesToDelete] = useState([]); // Holds image_id's to delete
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const isEditing = !!productToEdit;

  // Fetch categories
  useEffect(() => {
    if (isOpen) { // Fetch only when modal opens
      setIsLoading(true);
      getAllCategories()
        .then(data => setCategories(data || [])) // Handle potential null/undefined response
        .catch(err => setError('Could not load categories.'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && productToEdit) {
      setFormData({
        title: productToEdit.title || '',
        description: productToEdit.description || '',
        category_id: productToEdit.category_id || '',
        condition: productToEdit.condition || 'good',
        original_price: productToEdit.original_price || '',
        is_active: productToEdit.is_active !== undefined ? productToEdit.is_active : true,
        images: productToEdit.images || [], // Populate existing images
      });
      setNewImages([]); // Clear new images when opening for edit
      setImagePreviews([]);
      setImagesToDelete([]);
    } else {
      setFormData(initialState); // Reset form for adding
      setNewImages([]);
      setImagePreviews([]);
      setImagesToDelete([]);
    }
     setError(null); // Clear errors when modal opens/changes mode
  }, [isOpen, productToEdit, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if(error) setError(null);
  };

  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files);
    const currentTotalImages = formData.images.length + newImages.length;
    const allowedNew = 5 - currentTotalImages; // Max 5 total images

    if (files.length > allowedNew) {
        setError(`You can upload a maximum of 5 images total. Please select up to ${allowedNew} more.`);
        return;
    }

    const imageFiles = files.slice(0, allowedNew); // Only take allowed number
    setNewImages(prev => [...prev, ...imageFiles]);

    // Generate previews
    const previewUrls = imageFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previewUrls]);
    setError(null);
  };

  const removeNewImage = (index) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    // Clean up blob URL
    const urlToRemove = imagePreviews[index];
    URL.revokeObjectURL(urlToRemove);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const toggleImageForDeletion = (imageId) => {
    setImagesToDelete(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('description', formData.description);
    if (formData.category_id) payload.append('category_id', formData.category_id);
    payload.append('condition', formData.condition);
    payload.append('original_price', formData.original_price);
    payload.append('is_active', formData.is_active);

    if (isEditing) {
      // Append images marked for deletion (Backend expects array in req.body)
      // Multer *should* put non-file fields from FormData into req.body
      imagesToDelete.forEach(id => payload.append('images_to_delete[]', id));

      // Append *new* images for update (backend expects 'newImages' field)
      newImages.forEach(file => payload.append('newImages', file));
    } else {
      // Append images for create (backend expects 'images' field)
      newImages.forEach(file => payload.append('images', file));
    }


    try {
      let savedProduct;
      if (isEditing) {
        savedProduct = await updateProduct(productToEdit.product_id, payload);
      } else {
        savedProduct = await createProduct(payload);
      }
      onSave(savedProduct); // Pass saved product back to parent
      handleClose(); // Close modal on success
    } catch (err) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} product.`);
    } finally {
      setIsLoading(false);
    }
  };

   const handleClose = () => {
    // Clean up object URLs before closing
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setNewImages([]);
    setImagesToDelete([]);
    if (fileInputRef.current) fileInputRef.current.value = null;
    onClose(); // Call parent close handler
  };


  if (!isOpen) return null;

  return (
    <dialog id="product_modal" className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl">
        <button onClick={handleClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" disabled={isLoading}>✕</button>
        <h3 className="font-bold text-xl mb-5">{isEditing ? 'Edit Product' : 'Add New Product'}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="form-control">
            <label className="label"><span className="label-text">Title*</span></label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Product Title" className="input input-bordered" required disabled={isLoading} />
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label"><span className="label-text">Description</span></label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered h-24" placeholder="Describe your product..." disabled={isLoading}></textarea>
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Category</span></label>
              <select name="category_id" value={formData.category_id} onChange={handleChange} className="select select-bordered" disabled={isLoading || !categories.length}>
                <option value="">Select Category (Optional)</option>
                {/* Render categories (potentially nested later) */}
                {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Condition</span></label>
              <select name="condition" value={formData.condition} onChange={handleChange} className="select select-bordered" disabled={isLoading}>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          {/* Price & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Original Price* ($)</span></label>
              <input type="number" name="original_price" value={formData.original_price} onChange={handleChange} placeholder="e.g., 49.99" className="input input-bordered" required min="0" step="0.01" disabled={isLoading} />
            </div>
             <div className="form-control items-start pt-9">
                <label className="label cursor-pointer gap-2">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="checkbox checkbox-primary" disabled={isLoading}/>
                    <span className="label-text">Product is Active / For Sale</span>
                </label>
            </div>
          </div>

          {/* Image Management */}
          <div className="form-control space-y-3">
             <label className="label"><span className="label-text font-medium">Product Images (Max 5)</span></label>
             {/* Existing Images (for editing) */}
             {isEditing && formData.images.length > 0 && (
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                     {formData.images.map(img => (
                         <div key={img.image_id} className="relative group aspect-square border rounded-md overflow-hidden">
                             <img src={img.image_url} alt="Existing product" className="w-full h-full object-cover" />
                             <button
                                type="button"
                                onClick={() => toggleImageForDeletion(img.image_id)}
                                className={`absolute top-1 right-1 btn btn-xs btn-circle ${imagesToDelete.includes(img.image_id) ? 'btn-error opacity-100' : 'btn-neutral opacity-50 group-hover:opacity-100'} transition-opacity`}
                                title={imagesToDelete.includes(img.image_id) ? 'Cancel Deletion' : 'Mark for Deletion'}
                              >
                                 <FiTrash2 size={12}/>
                             </button>
                             {img.is_primary && <div className="absolute bottom-1 left-1 badge badge-primary badge-xs">Primary</div>}
                         </div>
                     ))}
                 </div>
             )}
             {/* New Image Previews */}
              {imagePreviews.length > 0 && (
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                     {imagePreviews.map((previewUrl, index) => (
                         <div key={index} className="relative group aspect-square border rounded-md overflow-hidden">
                             <img src={previewUrl} alt={`New preview ${index + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeNewImage(index)}
                                className="absolute top-1 right-1 btn btn-error btn-xs btn-circle opacity-60 group-hover:opacity-100 transition-opacity"
                                title="Remove Image"
                              >
                                 <FiX size={12}/>
                             </button>
                         </div>
                     ))}
                 </div>
             )}
             {/* File Input */}
             {(formData.images.length + newImages.length) < 5 && (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-base-200/50 hover:bg-base-300/50 border-base-300 hover:border-primary/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center text-base-content/70">
                        <FiUploadCloud className="w-8 h-8 mb-2"/>
                        <p className="mb-1 text-sm"><span className="font-semibold">Click to upload</span> or drag & drop</p>
                        <p className="text-xs">PNG, JPG, GIF up to 10MB</p>
                    </div>
                    <input
                        ref={fileInputRef}
                        id="dropzone-file"
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/png, image/jpeg, image/gif"
                        onChange={handleNewImageChange}
                        disabled={isLoading}
                    />
                </label>
             )}
          </div>


          {error && <div role="alert" className="alert alert-error text-sm"><svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{error}</span></div>}

          <div className="modal-action mt-6">
            <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={isLoading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner loading-sm"></span> : (isEditing ? 'Save Changes' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

export default AddEditProductModal;