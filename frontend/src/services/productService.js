import apiClient from './apiClient';

// Fetch products for the logged-in user
export const getLoggedInUserProducts = async () => {
  try {
    const response = await apiClient.get('/products/me');
    return response.data;
  } catch (error) {
    console.error("Error fetching user products:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch products.');
  }
};

// Create a new product (expects FormData)
export const createProduct = async (productFormData) => {
  try {
    const response = await apiClient.post('/products', productFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }, // Important for files
    });
    return response.data; // Usually returns the newly created product
  } catch (error) {
    console.error("Error creating product:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create product.');
  }
};

// Update an existing product (expects FormData)
export const updateProduct = async (productId, productFormData) => {
  try {
    // IMPORTANT: Send images_to_delete within FormData as well if backend expects it there,
    // otherwise, it might need a separate mechanism or be sent alongside text fields.
    // Your backend expects images_to_delete in req.body, which Multer *should* populate
    // from FormData text fields. Let's assume that works.
    const response = await apiClient.put(`/products/${productId}`, productFormData, {
       headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data; // Usually returns the updated product
  } catch (error) {
    console.error("Error updating product:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to update product.');
  }
};

// Delete a product
export const deleteProduct = async (productId) => {
  try {
    const response = await apiClient.delete(`/products/${productId}`);
    return response.data; // Usually returns a success message
  } catch (error) {
    console.error("Error deleting product:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to delete product.');
  }
};

// Fetch all categories (might be in its own categoryService.js)
export const getAllCategories = async () => {
    try {
        const response = await apiClient.get('/categories');
        return response.data;
    } catch (error) {
        console.error("Error fetching categories:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to fetch categories.');
    }
};
export const getProductById = async (productId) => {
    try {
      const response = await apiClient.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || `Failed to fetch product with ID ${productId}.`);
    }
  };
  export const assignProductsToStream = async (productIds, streamId) => {
    try {
      const response = await apiClient.post('/products/assign-to-stream', {
        product_ids: productIds,
        stream_id: streamId,
      });
      return response.data; // Expects { message, assigned_product_ids, stream_id }
    } catch (error) {
      console.error('Error assigning products to stream:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to assign products to stream.');
    }
  };
  export const getProductsByUserId = async (userId) => {
    try {
      const response = await apiClient.get(`/products/user/${userId}`);
      return response.data; // Array of products
    } catch (error) {
      console.error(`Error fetching products for user ${userId}:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || `Failed to fetch products for user ${userId}.`);
    }
  };