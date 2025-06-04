// src/pages/dashboard/CreateProductPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAllCategories, createProduct } from '../../services/productService';
import SectionCard from '../../components/common/SectionCard'; // Adjust path
import {
  FiArrowLeft, FiUploadCloud, FiX, FiPaperclip, FiHelpCircle,
  FiCheckSquare, FiAlertCircle
} from 'react-icons/fi';

const CreateProductPage = () => {
  const initialState = {
    title: '', description: '', category_id: '', condition: 'good',
    original_price: '', is_active: true, quantity: 1,
    flash_sale: false, accept_offers: false, reserve_for_live: false,
    shipping_profile_id: '', // Placeholder for now
    cost_per_item: '',
  };

  const [formData, setFormData] = useState(initialState);
  const [categories, setCategories] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsFetchingCategories(true);
    getAllCategories()
      .then(data => setCategories(data || []))
      .catch(err => setError('Could not load categories.'))
      .finally(() => setIsFetchingCategories(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' && value !== '' ? parseFloat(value) : value)
    }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (newImages.length + files.length > 5) {
      setError('You can upload a maximum of 5 images.');
      return;
    }
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
        setError('Some selected files were not valid images.');
    }
    setNewImages(prev => [...prev, ...validFiles]);
    const previewUrls = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previewUrls]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const removeNewImage = (indexToRemove) => {
    URL.revokeObjectURL(imagePreviews[indexToRemove]);
    setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (actionType) => { // 'publish', 'draft', 'cancel'
    if (actionType === 'cancel') {
      navigate('/dashboard/inventory');
      return;
    }
    setIsLoading(true); setError(null); setSuccess(null);
    const isPublishing = actionType === 'publish';

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('description', formData.description);
    if (formData.category_id) payload.append('category_id', formData.category_id);
    payload.append('condition', formData.condition);
    payload.append('original_price', formData.original_price);
    payload.append('is_active', isPublishing); // Based on action
    payload.append('quantity', formData.quantity || 1);
    if (formData.cost_per_item || formData.cost_per_item === 0) payload.append('cost_per_item', formData.cost_per_item);
    // Add other fields like flash_sale, accept_offers if backend supports them

    newImages.forEach(file => payload.append('images', file));

    try {
      const newProduct = await createProduct(payload);
      setSuccess(`Product "${newProduct.title}" ${isPublishing ? 'published' : 'saved as draft'} successfully!`);
      setTimeout(() => navigate('/dashboard/inventory'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to create product.');
    } finally {
      setIsLoading(false);
    }
  };


  // --- FORM SECTION RENDER FUNCTIONS ---
  const renderMediaSection = () => (
    <SectionCard title="Media">
      <label
        htmlFor="product-images-upload"
        className={`flex flex-col items-center justify-center w-full min-h-[10rem] border-2 border-dashed rounded-lg cursor-pointer bg-base-200/30 hover:bg-base-200/60 border-base-300 hover:border-primary/60 transition-colors p-4
                    ${newImages.length >= 5 ? '!cursor-not-allowed !bg-base-200/10 hover:!bg-base-200/10' : ''}`}
      >
        <FiUploadCloud className="w-8 h-8 mb-2 text-base-content/50"/>
        <p className="mb-1 text-sm text-base-content/80"><span className="font-semibold">Click to Upload</span> or Drag and Drop your Media</p>
        <p className="text-xs text-base-content/60">Choose your primary main photo first. Max 5 images.</p>
        <input
            ref={fileInputRef}
            id="product-images-upload"
            type="file"
            className="hidden"
            multiple
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleNewImageChange}
            disabled={isLoading || newImages.length >= 5}
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
                        disabled={isLoading}
                    > <FiX size={12}/> </button>
                    {index === 0 && <div className="absolute bottom-1 left-1 badge badge-primary badge-sm shadow">Primary</div>}
                </div>
            ))}
        </div>
      )}
    </SectionCard>
  );

  const renderProductDetailsSection = () => (
    <SectionCard title="Product Details" actions={
        <button type="button" className="btn btn-xs btn-outline btn-neutral normal-case gap-1" disabled>
            <FiPaperclip size={12}/> Use Barcode
        </button>
    }>
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Category*</span></label>
        <select name="category_id" value={formData.category_id} onChange={handleChange} className="select select-bordered w-full" required disabled={isLoading || isFetchingCategories}>
          <option value="" disabled>Select a category</option>
          {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
        </select>
      </div>
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Title*</span></label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Vintage Pokémon Card, Funko Pop" className="input input-bordered w-full" required disabled={isLoading} />
      </div>
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Description*</span></label>
        <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered w-full h-24" placeholder="Detailed description of your item, condition, etc." required disabled={isLoading}></textarea>
      </div>
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Quantity*</span></label>
        <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="input input-bordered w-full" required min="0" step="1" disabled={isLoading} />
      </div>
    </SectionCard>
  );

  const renderVariantsSection = () => (
    <SectionCard title="Variants" description="Add various colors or sizes and quantities for this product.">
      <div className="flex justify-end items-center">
        <input type="checkbox" className="toggle toggle-primary" disabled />
      </div>
    </SectionCard>
  );

  const renderPricingSection = () => (
    <SectionCard title="Pricing">
        <div className="tabs mb-4">
            <button type="button" className="tab tab-lg tab-lifted tab-active !bg-neutral !text-neutral-content rounded-t-md font-medium">Buy It Now</button>
            <button type="button" className="tab tab-lg tab-lifted opacity-50 cursor-not-allowed" disabled>Auction</button>
        </div>
        <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium">Price (USD)*</span></label>
            <input type="number" name="original_price" value={formData.original_price} onChange={handleChange} placeholder="0.00" className="input input-bordered w-full" required min="0.01" step="0.01" disabled={isLoading}/>
        </div>
        <div className="pt-2 space-y-1">
            <label className="label cursor-pointer py-2 justify-between items-center">
                <div>
                    <span className="label-text font-medium">Flash Sale</span>
                    <p className="text-xs text-base-content/60 pr-4">Turn this on to enable flash sales on this product.</p>
                </div>
                <input type="checkbox" name="flash_sale" checked={formData.flash_sale} onChange={handleChange} className="toggle toggle-primary" disabled={isLoading} />
            </label>
             <div className="divider my-0"></div>
            <label className="label cursor-pointer py-2 justify-between items-center">
                <div>
                    <span className="label-text font-medium">Accept Offers</span>
                    <p className="text-xs text-base-content/60 pr-4">Turn this on if you are willing to accept offers in lives and the marketplace. You can accept, counter or decline the offers.</p>
                </div>
                <input type="checkbox" name="accept_offers" checked={formData.accept_offers} onChange={handleChange} className="toggle toggle-primary" disabled={isLoading} />
            </label>
             <div className="divider my-0"></div>
            <label className="label cursor-pointer py-2 justify-between items-center">
                <div>
                    <span className="label-text font-medium">Reserve for Live</span>
                    <p className="text-xs text-base-content/60 pr-4">Turn this on to make this product only purchasable within a show.</p>
                </div>
                <input type="checkbox" name="reserve_for_live" checked={formData.reserve_for_live} onChange={handleChange} className="toggle toggle-primary" disabled={isLoading} />
            </label>
        </div>
    </SectionCard>
  );

  const renderShippingSection = () => (
    <SectionCard title="Shipping">
        <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium">Shipping Profile*</span></label>
            <select name="shipping_profile_id" value={formData.shipping_profile_id} onChange={handleChange} className="select select-bordered w-full" disabled /* Placeholder */ >
                 <option value="">Default Shipping (Not Implemented)</option>
            </select>
        </div>
         <div className="form-control mt-3">
            <label className="label cursor-pointer py-2 justify-between items-center">
                <div>
                    <span className="label-text font-medium text-error">Hazardous Materials*</span>
                    <p className="text-xs text-base-content/60 pr-4">Confirm this item not the shipping of fragrances, nail polish, electronics containing lithium batteries, and any items that may pose risks to health and safety.</p>
                </div>
                <input type="checkbox" name="no_hazardous_materials" /* Add to state if needed */ className="toggle toggle-sm toggle-primary" disabled={isLoading} required/>
            </label>
        </div>
    </SectionCard>
  );

 const renderOptionalFieldsSection = () => (
    <SectionCard title="Optional Fields" description="This information can only be seen by you.">
        <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium">Cost Per Item</span></label>
            <input type="number" name="cost_per_item" value={formData.cost_per_item} onChange={handleChange} placeholder="0.00" className="input input-bordered w-full" min="0" step="0.01" disabled={isLoading}/>
        </div>
    </SectionCard>
  );
  // --- END FORM SECTION RENDER FUNCTIONS ---


  return (
    <div className="space-y-5 pb-28"> {/* Increased bottom padding for sticky footer */}
      <div className="flex items-center gap-2 pt-3">
        <Link to="/dashboard/inventory" className="btn btn-ghost btn-sm btn-circle p-0 -ml-1">
          <FiArrowLeft size={24} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-base-content">Create a Product</h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {renderMediaSection()}
        {renderProductDetailsSection()}
        {renderVariantsSection()}
        {renderPricingSection()}
        {renderShippingSection()}
        {renderOptionalFieldsSection()}

        {error && <div role="alert" className="alert alert-error mt-6 shadow-md"><FiAlertCircle size={20}/><span>{error}</span></div>}
        {success && <div role="alert" className="alert alert-success mt-6 shadow-md"><FiCheckSquare size={20}/><span>{success}</span></div>}
      </form>

      {/* Sticky Footer Actions */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-base-100 p-3 sm:p-4 border-t border-base-300 flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-3 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.1)] z-20">
        <p className="text-xs text-base-content/60 mr-auto hidden md:flex items-center gap-1">
            <FiHelpCircle size={14}/> Complete <Link to="#" className="link link-primary">key information</Link> fields to create a quality listing...
        </p>
        <button type="button" onClick={() => handleSubmit('cancel')} className="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto order-3 sm:order-1" disabled={isLoading}>Cancel</button>
        <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-outline btn-sm sm:btn-md w-full sm:w-auto order-2" disabled={isLoading}>
          {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "Save Draft"}
        </button>
        <button type="button" onClick={() => handleSubmit('publish')} className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto order-1 sm:order-3 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400" disabled={isLoading}>
          {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "Publish"}
        </button>
      </div>
    </div>
  );
};

export default CreateProductPage;