// src/pages/dashboard/EditProductPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { getAllCategories, updateProduct, getProductById } from '../../services/productService';
import SectionCard from '../../components/common/SectionCard'; // Adjust path
import {
  FiArrowLeft, FiUploadCloud, FiX, FiPaperclip, FiHelpCircle, FiTrash2,
  FiCheckSquare, FiAlertCircle
} from 'react-icons/fi';

const EditProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialState = {
    title: '', description: '', category_id: '', condition: 'good',
    original_price: '', is_active: true, quantity: 1,
    flash_sale: false, accept_offers: false, reserve_for_live: false,
    shipping_profile_id: '', cost_per_item: '',
    images: [],
  };

  const [formData, setFormData] = useState(initialState);
  const [productToEdit, setProductToEdit] = useState(location.state?.product || null);
  const [categories, setCategories] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setIsLoadingData(true);
    setIsFetchingCategories(true);
    setError(null);

    const fetchInitialData = async () => {
        try {
            const productDataFromAPI = await getProductById(productId);
            const categoryData = await getAllCategories();

            if (productDataFromAPI) {
                setProductToEdit(productDataFromAPI);
                const initialImages = productDataFromAPI.images || [];
                setFormData({
                    title: productDataFromAPI.title || '',
                    description: productDataFromAPI.description || '',
                    category_id: productDataFromAPI.category_id || '',
                    condition: productDataFromAPI.condition || 'good',
                    original_price: productDataFromAPI.original_price || '',
                    is_active: productDataFromAPI.is_active !== undefined ? productDataFromAPI.is_active : true,
                    quantity: productDataFromAPI.quantity || 1,
                    images: initialImages,
                    flash_sale: productDataFromAPI.flash_sale || false,
                    accept_offers: productDataFromAPI.accept_offers || false,
                    reserve_for_live: productDataFromAPI.reserve_for_live || false,
                    cost_per_item: productDataFromAPI.cost_per_item || '',
                    shipping_profile_id: productDataFromAPI.shipping_profile_id || '',
                });
            } else {
                setError("Product not found.");
            }
            setCategories(categoryData || []);
        } catch (err) {
            setError(err.message || "Failed to load product data or categories.");
        } finally {
            setIsLoadingData(false);
            setIsFetchingCategories(false);
        }
    };

    if (productId) {
        fetchInitialData();
    } else {
        setError("Product ID is missing in URL.");
        setIsLoadingData(false);
        setIsFetchingCategories(false);
    }
  }, [productId]);


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
    const currentVisibleImagesCount = (formData.images?.length || 0) - imagesToDelete.length + newImages.length;
    const allowedNew = 5 - currentVisibleImagesCount;

    if (files.length > allowedNew && allowedNew > 0) {
      setError(`You can upload a maximum of 5 images total. Please select up to ${allowedNew} more.`);
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    } else if (allowedNew <= 0 && files.length > 0) {
      setError('Maximum 5 images already selected/uploaded.');
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }

    const validFiles = files.filter(file => file.type.startsWith('image/')).slice(0, allowedNew);
    if (validFiles.length !== files.length && files.length > allowedNew) { /* error already set */ }
    else if (validFiles.length !== files.length) { setError('Some selected files were not valid images.'); }

    setNewImages(prev => [...prev, ...validFiles]);
    const previewUrls = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previewUrls]);
    if (!error && validFiles.length > 0) setError(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const removeNewImage = (indexToRemove) => {
    URL.revokeObjectURL(imagePreviews[indexToRemove]);
    setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const toggleImageForDeletion = (imageId) => {
    setImagesToDelete(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleSubmit = async (actionType) => {
    if (actionType === 'cancel') {
      navigate('/dashboard/inventory');
      return;
    }
    setIsSubmitting(true); setError(null); setSuccess(null);
    const isPublishing = actionType === 'publish';

    const payload = new FormData();
    Object.keys(formData).forEach(key => {
      if (key !== 'images') {
        if (key === 'is_active') {
            payload.append(key, isPublishing);
        } else if (formData[key] !== null && formData[key] !== undefined) {
            payload.append(key, formData[key]);
        }
      }
    });

    imagesToDelete.forEach(id => payload.append('images_to_delete[]', id));
    newImages.forEach(file => payload.append('newImages', file));

    try {
      const updatedData = await updateProduct(productId, payload);
      setSuccess(`Product "${updatedData.title || formData.title}" ${isPublishing ? 'updated successfully' : 'saved as draft'}!`);
      setProductToEdit(updatedData);
      setFormData(prev => ({
        ...prev,
        ...updatedData,
        images: updatedData.images || []
      }));
      setNewImages([]);
      setImagePreviews(prev => { prev.forEach(URL.revokeObjectURL); return []; });
      setImagesToDelete([]);

      setTimeout(() => {
        // setSuccess(null); // Optional: clear success before navigating
        navigate('/dashboard/inventory');
      }, 1500); // Adjust delay or remove if success message should be a toast on next page
    } catch (err) {
      setError(err.message || 'Failed to update product.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- FORM SECTION RENDER FUNCTIONS ---
  const renderMediaSection = () => (
    <SectionCard title="Media">
      {formData.images && formData.images.length > 0 && (
        <div className="mb-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {formData.images.map((img, index) => (
            <div key={img.image_id || `existing-${index}-${Math.random()}`} className={`relative group aspect-square border border-base-300 rounded-md overflow-hidden shadow-sm ${imagesToDelete.includes(img.image_id) ? 'opacity-40 ring-2 ring-error ring-offset-1' : ''}`}>
              <img src={img.image_url} alt={`Existing ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => toggleImageForDeletion(img.image_id)}
                className={`absolute top-1 right-1 btn btn-xs btn-circle shadow-md ${imagesToDelete.includes(img.image_id) ? 'btn-success opacity-100' : 'btn-error opacity-60 group-hover:opacity-100'} transition-opacity`}
                title={imagesToDelete.includes(img.image_id) ? 'Undo Mark for Deletion' : 'Mark for Deletion'}
                disabled={isSubmitting}
              >
                {imagesToDelete.includes(img.image_id) ? <FiX className="text-white stroke-2"/> : <FiTrash2 size={12}/>}
              </button>
              {img.is_primary && !imagesToDelete.includes(img.image_id) && <div className="absolute bottom-1 left-1 badge badge-primary badge-sm shadow">Primary</div>}
            </div>
          ))}
        </div>
      )}
       <label
        htmlFor="product-images-upload"
        className={`flex flex-col items-center justify-center w-full min-h-[10rem] border-2 border-dashed rounded-lg cursor-pointer bg-base-200/30 hover:bg-base-200/60 border-base-300 hover:border-primary/60 transition-colors p-4
                    ${(formData.images?.length || 0) - imagesToDelete.length + newImages.length >= 5 ? '!cursor-not-allowed !bg-base-200/10 hover:!bg-base-200/10 !border-base-300/50' : ''}`}
      >
        <FiUploadCloud className="w-8 h-8 mb-2 text-base-content/50"/>
        <p className="mb-1 text-sm text-base-content/80"><span className="font-semibold">Upload More Images</span></p>
        <p className="text-xs text-base-content/60">Max 5 images total. {(formData.images?.length || 0) - imagesToDelete.length + newImages.length} / 5 uploaded.</p>
        <input
            ref={fileInputRef}
            id="product-images-upload"
            type="file"
            className="hidden"
            multiple
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleNewImageChange}
            disabled={isSubmitting || (formData.images?.length || 0) - imagesToDelete.length + newImages.length >= 5}
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
        <select name="category_id" value={formData.category_id} onChange={handleChange} className="select select-bordered w-full" required disabled={isSubmitting || isFetchingCategories}>
          <option value="" disabled>Select a category</option>
          {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
        </select>
      </div>
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Title*</span></label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Vintage Pokémon Card, Funko Pop" className="input input-bordered w-full" required disabled={isSubmitting} />
      </div>
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Description*</span></label>
        <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered w-full h-24" placeholder="Detailed description of your item, condition, etc." required disabled={isSubmitting}></textarea>
      </div>
      <div className="form-control">
        <label className="label py-1"><span className="label-text font-medium">Quantity*</span></label>
        <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="input input-bordered w-full" required min="0" step="1" disabled={isSubmitting} />
      </div>
    </SectionCard>
  );

  const renderVariantsSection = () => (
    <SectionCard title="Variants" description="Add various colors or sizes and quantities for this product.">
      <div className="flex justify-end items-center">
        <input type="checkbox" className="toggle toggle-primary" disabled={isSubmitting} />
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
            <input type="number" name="original_price" value={formData.original_price} onChange={handleChange} placeholder="0.00" className="input input-bordered w-full" required min="0.01" step="0.01" disabled={isSubmitting}/>
        </div>
        <div className="pt-2 space-y-1">
            <label className="label cursor-pointer py-2 justify-between items-center">
                <div>
                    <span className="label-text font-medium">Flash Sale</span>
                    <p className="text-xs text-base-content/60 pr-4">Turn this on to enable flash sales on this product.</p>
                </div>
                <input type="checkbox" name="flash_sale" checked={formData.flash_sale} onChange={handleChange} className="toggle toggle-primary" disabled={isSubmitting} />
            </label>
             <div className="divider my-0"></div>
            <label className="label cursor-pointer py-2 justify-between items-center">
                <div>
                    <span className="label-text font-medium">Accept Offers</span>
                    <p className="text-xs text-base-content/60 pr-4">Turn this on if you are willing to accept offers in lives and the marketplace. You can accept, counter or decline the offers.</p>
                </div>
                <input type="checkbox" name="accept_offers" checked={formData.accept_offers} onChange={handleChange} className="toggle toggle-primary" disabled={isSubmitting} />
            </label>
             <div className="divider my-0"></div>
            <label className="label cursor-pointer py-2 justify-between items-center">
                <div>
                    <span className="label-text font-medium">Reserve for Live</span>
                    <p className="text-xs text-base-content/60 pr-4">Turn this on to make this product only purchasable within a show.</p>
                </div>
                <input type="checkbox" name="reserve_for_live" checked={formData.reserve_for_live} onChange={handleChange} className="toggle toggle-primary" disabled={isSubmitting} />
            </label>
        </div>
    </SectionCard>
  );

  const renderShippingSection = () => (
    <SectionCard title="Shipping">
        <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium">Shipping Profile*</span></label>
            <select name="shipping_profile_id" value={formData.shipping_profile_id} onChange={handleChange} className="select select-bordered w-full" disabled={isSubmitting} >
                 <option value="">Default Shipping (Not Implemented)</option>
            </select>
        </div>
         <div className="form-control mt-3">
            <label className="label cursor-pointer py-2 justify-between items-center">
                <div>
                    <span className="label-text font-medium text-error">Hazardous Materials*</span>
                    <p className="text-xs text-base-content/60 pr-4">Confirm this item not the shipping of fragrances, nail polish, electronics containing lithium batteries, and any items that may pose risks to health and safety.</p>
                </div>
                <input type="checkbox" name="no_hazardous_materials" className="toggle toggle-sm toggle-primary" disabled={isSubmitting} required/>
            </label>
        </div>
    </SectionCard>
  );

 const renderOptionalFieldsSection = () => (
    <SectionCard title="Optional Fields" description="This information can only be seen by you.">
        <div className="form-control">
            <label className="label py-1"><span className="label-text font-medium">Cost Per Item</span></label>
            <input type="number" name="cost_per_item" value={formData.cost_per_item} onChange={handleChange} placeholder="0.00" className="input input-bordered w-full" min="0" step="0.01" disabled={isSubmitting}/>
        </div>
    </SectionCard>
  );
  // --- END FORM SECTION RENDER FUNCTIONS ---


  if (isLoadingData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><span className="loading loading-lg loading-ball text-primary"></span></div>;
  }
  if (error && !productToEdit && !isLoadingData) { // If product failed to load initially and not just a submission error
    return <div role="alert" className="alert alert-error m-6 shadow-lg"><FiAlertCircle size={24}/><div><h3 className="font-bold">Error Loading Product!</h3><div className="text-xs">{error}</div></div> <Link to="/dashboard/inventory" className="btn btn-sm btn-neutral">Back to Inventory</Link></div>;
  }
   if (!productToEdit && !isLoadingData) { // Product not found but no specific error, or ID missing
      return <div role="alert" className="alert alert-warning m-6 shadow-lg"><FiAlertCircle size={24}/><div><h3 className="font-bold">Product Not Found</h3><div className="text-xs">The requested product could not be loaded. It may have been deleted or the ID is incorrect.</div></div> <Link to="/dashboard/inventory" className="btn btn-sm btn-neutral">Back to Inventory</Link></div>;
  }


  return (
    <div className="space-y-5 pb-28"> {/* Main page container */}
      <div className="flex items-center gap-2 pt-3">
        <Link to="/dashboard/inventory" className="btn btn-ghost btn-sm btn-circle p-0 -ml-1">
          <FiArrowLeft size={24} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-base-content">Edit Product: <span className="text-primary truncate max-w-xs inline-block">{formData.title || 'Loading...'}</span></h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {renderMediaSection()}
        {renderProductDetailsSection()}
        {renderVariantsSection()}
        {renderPricingSection()}
        {renderShippingSection()}
        {renderOptionalFieldsSection()}

        {/* Display error only if there's no success message, to avoid showing both */}
        {error && !success && <div role="alert" className="alert alert-error mt-6 shadow-md"><FiAlertCircle size={20}/><span>{error}</span></div>}
        {success && <div role="alert" className="alert alert-success mt-6 shadow-md"><FiCheckSquare size={20}/><span>{success}</span></div>}
      </form>

      {/* Sticky Footer Actions */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-base-100 p-3 sm:p-4 border-t border-base-300 flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-3 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.1)] z-20">
        <p className="text-xs text-base-content/60 mr-auto hidden md:flex items-center gap-1"><FiHelpCircle size={14}/> Edit your product details and save changes.</p>
        <button type="button" onClick={() => handleSubmit('cancel')} className="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto order-3 sm:order-1" disabled={isSubmitting}>Cancel</button>
        <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-outline btn-sm sm:btn-md w-full sm:w-auto order-2" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : "Save as Draft"}
        </button>
        <button type="button" onClick={() => handleSubmit('publish')} className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto order-1 sm:order-3 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : "Update Product"}
        </button>
      </div>
    </div>
  );
};

export default EditProductPage;