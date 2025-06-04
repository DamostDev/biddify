// src/pages/dashboard/EditProductPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { getAllCategories, updateProduct as apiUpdateProduct, getProductById } from '../../services/productService'; // Renamed
import SectionCard from '../../components/common/SectionCard';
import {
  FiArrowLeft, FiUploadCloud, FiX, FiTrash2, FiHelpCircle,
  FiCheckSquare, FiAlertCircle, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';

const EditProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialFormState = {
    title: '', description: '', category_id: '', condition: 'good',
    original_price: '', is_active: true, quantity: 1,
    cost_per_item: '', images: [],
  };

  const [formData, setFormData] = useState(initialFormState);
  const [categories, setCategories] = useState([]);
  const [newImages, setNewImages] = useState([]); // File objects for new uploads
  const [imagePreviews, setImagePreviews] = useState([]); // Data URLs for new image previews
  const [imagesToDelete, setImagesToDelete] = useState([]); // image_id's to delete

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

    const fetchInitialData = async () => {
        try {
            const [productDataFromAPI, categoryData] = await Promise.all([
                getProductById(productId),
                getAllCategories()
            ]);

            if (productDataFromAPI) {
                const initialImages = productDataFromAPI.images || [];
                setFormData({
                    title: productDataFromAPI.title || '',
                    description: productDataFromAPI.description || '',
                    category_id: productDataFromAPI.category_id || '',
                    condition: productDataFromAPI.condition || 'good',
                    original_price: productDataFromAPI.original_price || '',
                    is_active: productDataFromAPI.is_active !== undefined ? productDataFromAPI.is_active : true,
                    quantity: productDataFromAPI.quantity === undefined ? 1 : productDataFromAPI.quantity,
                    cost_per_item: productDataFromAPI.cost_per_item || '',
                    images: initialImages,
                });
                setNewImages([]);
                setImagePreviews([]);
                setImagesToDelete([]);
            } else {
                setError("Product not found or could not be loaded.");
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
        setError("Product ID is missing.");
        setIsLoadingData(false);
        setIsFetchingCategories(false);
    }
  }, [productId]);


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
    if (!error && validFiles.length > 0 && !error.includes('maximum')) setError(null);
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

    if (!formData.title || !formData.original_price || formData.original_price <= 0) {
        setError('Please fill in Title and Price (must be > 0).');
        return;
    }
    if (((formData.images?.length || 0) - imagesToDelete.length + newImages.length) === 0) {
        setError('Please upload at least one image for the product.');
        return;
    }

    setIsSubmitting(true); setError(null); setSuccess(null);

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('description', formData.description);
    if (formData.category_id) payload.append('category_id', formData.category_id);
    payload.append('condition', formData.condition);
    payload.append('original_price', formData.original_price);
    payload.append('is_active', formData.is_active); // Send current is_active state
    payload.append('quantity', formData.quantity || 1);
    if (formData.cost_per_item || formData.cost_per_item === 0) payload.append('cost_per_item', formData.cost_per_item);

    imagesToDelete.forEach(id => payload.append('images_to_delete[]', id)); // Backend needs array format
    newImages.forEach(file => payload.append('newImages', file));

    try {
      const updatedData = await apiUpdateProduct(productId, payload);
      setSuccess(`Product "${updatedData.title || formData.title}" updated successfully!`);
      // Refresh form data with response, especially for images
      setFormData(prev => ({
        ...prev,
        ...updatedData,
        images: updatedData.images || [] // Update existing images list
      }));
      setNewImages([]); // Clear staging area for new images
      imagePreviews.forEach(url => URL.revokeObjectURL(url)); // Clean up previews
      setImagePreviews([]);
      setImagesToDelete([]); // Clear deletion list

      setTimeout(() => {
        navigate('/dashboard/inventory');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update product.');
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
        <p className="text-xs text-base-content/60">Max 5 images total. {(formData.images?.length || 0) - imagesToDelete.length + newImages.length} / 5.</p>
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
        <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered w-full h-24" placeholder="Detailed description of your item, condition, etc." disabled={isSubmitting}></textarea>
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
            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="1" className="input input-bordered w-full" required min="0" step="1" disabled={isSubmitting} />
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

  const renderStatusSection = () => (
    <SectionCard title="Product Status">
        <div className="form-control">
            <label className="label cursor-pointer py-2 justify-start items-center gap-3">
                <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className={`toggle toggle-lg ${formData.is_active ? 'toggle-success' : 'toggle-error'}`} // Changed to success/error
                    disabled={isSubmitting}
                />
                <span className="label-text text-base font-medium">
                    {formData.is_active ? 'Active (Listed for Sale)' : 'Inactive (Not Listed)'}
                </span>
                {formData.is_active ? <FiToggleRight size={28} className="text-success" /> : <FiToggleLeft size={28} className="text-error"/>}
            </label>
            <p className="text-xs text-base-content/60 mt-1 ml-12">
                {formData.is_active
                    ? 'This product is currently visible and purchasable in the marketplace.'
                    : 'This product is saved as a draft or has been delisted. It is not visible to buyers.'}
            </p>
        </div>
    </SectionCard>
  );

  // --- END FORM SECTION RENDER FUNCTIONS ---

  if (isLoadingData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><span className="loading loading-lg loading-ball text-primary"></span></div>;
  }
  if (error && !formData.title && !isLoadingData) { // If initial load failed catastrophically
    return <div role="alert" className="alert alert-error m-6 shadow-lg"><FiAlertCircle size={24}/><div><h3 className="font-bold">Error Loading Product!</h3><div className="text-xs">{error}</div></div> <Link to="/dashboard/inventory" className="btn btn-sm btn-neutral">Back to Inventory</Link></div>;
  }
  if (!formData.title && !isLoadingData && !error && productId) { // Product was not found (e.g., bad ID), but no network error
      return <div role="alert" className="alert alert-warning m-6 shadow-lg"><FiAlertCircle size={24}/><div><h3 className="font-bold">Product Not Found</h3><div className="text-xs">The product with ID '{productId}' could not be found. It may have been deleted or the ID is incorrect.</div></div> <Link to="/dashboard/inventory" className="btn btn-sm btn-neutral">Back to Inventory</Link></div>;
  }


  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center gap-2 pt-3">
        <Link to="/dashboard/inventory" className="btn btn-ghost btn-sm btn-circle p-0 -ml-1">
          <FiArrowLeft size={24} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-base-content">Edit Product: <span className="text-primary truncate max-w-xs inline-block">{formData.title || 'Loading...'}</span></h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {renderMediaSection()}
        {renderProductDetailsSection()}
        {renderPricingSection()}
        {renderStatusSection()}
        {renderOptionalFieldsSection()}

        {error && !success && <div role="alert" className="alert alert-error mt-6 shadow-md"><FiAlertCircle size={20}/><span>{error}</span></div>}
        {success && <div role="alert" className="alert alert-success mt-6 shadow-md"><FiCheckSquare size={20}/><span>{success}</span></div>}
      </form>

      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-base-100 p-3 sm:p-4 border-t border-base-300 flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-3 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.1)] z-20">
        <p className="text-xs text-base-content/60 mr-auto hidden md:flex items-center gap-1"><FiHelpCircle size={14}/> Edit your product details and save changes.</p>
        <button type="button" onClick={() => handleSubmit('cancel')} className="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto order-2 sm:order-1" disabled={isSubmitting}>Cancel</button>
        {/* <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-outline btn-sm sm:btn-md w-full sm:w-auto order-2" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : "Save Changes (Keep Draft)"}
        </button> */}
        <button type="button" onClick={() => handleSubmit('publish')} className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto order-1 sm:order-3 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : "Save and Update Product"}
        </button>
      </div>
    </div>
  );
};

export default EditProductPage;