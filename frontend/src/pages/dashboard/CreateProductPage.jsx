// src/pages/dashboard/CreateProductPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAllCategories, createProduct as apiCreateProduct } from '../../services/productService'; // Renamed to avoid conflict
import SectionCard from '../../components/common/SectionCard';
import {
  FiArrowLeft, FiUploadCloud, FiX, FiHelpCircle,
  FiCheckSquare, FiAlertCircle
} from 'react-icons/fi';

const CreateProductPage = () => {
  const initialState = {
    title: '',
    description: '',
    category_id: '',
    condition: 'good', // Default condition
    original_price: '',
    quantity: 1, // Default quantity
    cost_per_item: '',
    // is_active is set by the button clicked (Publish vs Save Draft)
  };

  const [formData, setFormData] = useState(initialState);
  const [categories, setCategories] = useState([]);
  const [newImages, setNewImages] = useState([]); // Holds File objects
  const [imagePreviews, setImagePreviews] = useState([]); // Holds Data URLs for previews

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
      [name]: type === 'checkbox' ? checked : (name === 'original_price' || name === 'quantity' || name === 'cost_per_item' ? (value === '' ? '' : parseFloat(value)) : value)
    }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (newImages.length + files.length > 5) {
      setError('You can upload a maximum of 5 images.');
      if (fileInputRef.current) fileInputRef.current.value = null; // Reset input
      return;
    }
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      setError('Some selected files were not valid images. Please select PNG, JPG, GIF, or WEBP.');
    }
    setNewImages(prev => [...prev, ...validFiles]);
    const previewUrls = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previewUrls]);
    if (validFiles.length > 0 && error && !error.includes('maximum')) setError(null); // Clear non-limit errors
    if (fileInputRef.current) fileInputRef.current.value = null; // Reset input
  };

  const removeNewImage = (indexToRemove) => {
    URL.revokeObjectURL(imagePreviews[indexToRemove]); // Clean up blob URL
    setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (actionType) => { // 'publish', 'draft', 'cancel'
    if (actionType === 'cancel') {
      navigate('/dashboard/inventory');
      return;
    }
    // Basic client-side validation
    if (!formData.title || !formData.original_price || formData.original_price <= 0 || newImages.length === 0) {
        setError('Please fill in Title, Price (must be > 0), and upload at least one image.');
        return;
    }

    setIsSubmitting(true); setError(null); setSuccess(null);
    const isPublishing = actionType === 'publish';

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('description', formData.description);
    if (formData.category_id) payload.append('category_id', formData.category_id);
    payload.append('condition', formData.condition);
    payload.append('original_price', formData.original_price);
    payload.append('is_active', isPublishing); // Set based on action
    payload.append('quantity', formData.quantity || 1);
    if (formData.cost_per_item || formData.cost_per_item === 0) payload.append('cost_per_item', formData.cost_per_item);

    newImages.forEach(file => payload.append('images', file)); // Backend expects 'images' for create

    try {
      const newProduct = await apiCreateProduct(payload);
      setSuccess(`Product "${newProduct.title}" ${isPublishing ? 'published' : 'saved as draft'} successfully!`);
      setFormData(initialState); // Reset form
      setNewImages([]);
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImagePreviews([]);
      setTimeout(() => navigate('/dashboard/inventory'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create product.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- FORM SECTION RENDER FUNCTIONS ---
  const renderMediaSection = () => (
    <SectionCard title="Media">
      <label
        htmlFor="product-images-upload"
        className={`flex flex-col items-center justify-center w-full min-h-[10rem] border-2 border-dashed rounded-lg cursor-pointer bg-base-200/30 hover:bg-base-200/60 border-base-300 hover:border-primary/60 transition-colors p-4
                    ${newImages.length >= 5 ? '!cursor-not-allowed !bg-base-200/10 hover:!bg-base-200/10 !border-base-300/50' : ''}`}
      >
        <FiUploadCloud className="w-8 h-8 mb-2 text-base-content/50"/>
        <p className="mb-1 text-sm text-base-content/80"><span className="font-semibold">Click to Upload</span> or Drag and Drop</p>
        <p className="text-xs text-base-content/60">Max 5 images. First uploaded is primary. ({newImages.length}/5)</p>
        <input
            ref={fileInputRef}
            id="product-images-upload"
            type="file"
            className="hidden"
            multiple
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleNewImageChange}
            disabled={isSubmitting || newImages.length >= 5}
        />
      </label>
      {imagePreviews.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {imagePreviews.map((previewUrl, index) => (
                <div key={previewUrl} className="relative group aspect-square border border-base-300 rounded-md overflow-hidden shadow-sm">
                    <img src={previewUrl} alt={`New preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-1 right-1 btn btn-error btn-xs btn-circle opacity-70 group-hover:opacity-100 transition-opacity"
                        title="Remove Image"
                        disabled={isSubmitting}
                    > <FiX size={12}/> </button>
                    {index === 0 && <div className="absolute bottom-1 left-1 badge badge-primary badge-sm shadow">Primary</div>}
                </div>
            ))}
        </div>
      )}
    </SectionCard>
  );

  const renderProductDetailsSection = () => (
    <SectionCard title="Product Details">
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Category</span></label>
        <select name="category_id" value={formData.category_id} onChange={handleChange} className="select select-bordered w-full" disabled={isSubmitting || isFetchingCategories}>
          <option value="">Select a category (Optional)</option>
          {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
        </select>
         {isFetchingCategories && <span className="text-xs text-info mt-1">Loading categories...</span>}
      </div>
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Title*</span></label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Vintage Pokémon Card, Funko Pop" className="input input-bordered w-full" required disabled={isSubmitting} />
      </div>
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Description</span></label>
        <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered w-full h-24" placeholder="Detailed description of your item, condition, notable features, etc." disabled={isSubmitting}></textarea>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
                <label className="label py-1"><span className="label-text font-medium">Condition*</span></label>
                <select name="condition" value={formData.condition} onChange={handleChange} className="select select-bordered w-full" required disabled={isSubmitting}>
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                </select>
            </div>
            <div className="form-control">
                <label className="label py-1"><span className="label-text font-medium">Quantity*</span></label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="1" className="input input-bordered w-full" required min="1" step="1" disabled={isSubmitting} />
            </div>
       </div>
    </SectionCard>
  );

  const renderPricingSection = () => (
    <SectionCard title="Pricing">
        <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium">Price (USD)*</span></label>
            <input type="number" name="original_price" value={formData.original_price} onChange={handleChange} placeholder="0.00" className="input input-bordered w-full" required min="0.01" step="0.01" disabled={isSubmitting}/>
        </div>
    </SectionCard>
  );

 const renderOptionalFieldsSection = () => (
    <SectionCard title="Optional Internal Fields" description="This information can only be seen by you.">
        <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium">Cost Per Item (USD)</span></label>
            <input type="number" name="cost_per_item" value={formData.cost_per_item} onChange={handleChange} placeholder="0.00" className="input input-bordered w-full" min="0" step="0.01" disabled={isSubmitting}/>
             <p className="text-xs text-base-content/60 mt-1">Track your cost for profit calculation.</p>
        </div>
    </SectionCard>
  );
  // --- END FORM SECTION RENDER FUNCTIONS ---


  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center gap-2 pt-3">
        <Link to="/dashboard/inventory" className="btn btn-ghost btn-sm btn-circle p-0 -ml-1">
          <FiArrowLeft size={24} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-base-content">Create a New Product</h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {renderMediaSection()}
        {renderProductDetailsSection()}
        {renderPricingSection()}
        {renderOptionalFieldsSection()}

        {error && <div role="alert" className="alert alert-error mt-6 shadow-md"><FiAlertCircle size={20}/><span>{error}</span></div>}
        {success && <div role="alert" className="alert alert-success mt-6 shadow-md"><FiCheckSquare size={20}/><span>{success}</span></div>}
      </form>

      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-base-100 p-3 sm:p-4 border-t border-base-300 flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-3 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.1)] z-20">
        <p className="text-xs text-base-content/60 mr-auto hidden md:flex items-center gap-1">
            <FiHelpCircle size={14}/> Fill in required fields (*) and add images to list your product.
        </p>
        <button type="button" onClick={() => handleSubmit('cancel')} className="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto order-3 sm:order-1" disabled={isSubmitting}>Cancel</button>
        <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-outline btn-sm sm:btn-md w-full sm:w-auto order-2" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : "Save as Draft"}
        </button>
        <button type="button" onClick={() => handleSubmit('publish')} className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto order-1 sm:order-3 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : "Publish Product"}
        </button>
      </div>
    </div>
  );
};

export default CreateProductPage;