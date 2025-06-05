import React from 'react';
import { FiEdit, FiTrash2, FiTv } from 'react-icons/fi';

const ProductTable = ({
  products = [],
  onEdit,
  onDelete,
  selectedProductIds = [],
  onSelectProduct,
  onSelectAllProducts, // Renamed from onSelectAllCurrentPageProducts for clarity from parent
  isLoading,
}) => {

  const handleSelectAllClick = (e) => {
    const isChecked = e.target.checked;
    // Only consider active products for select all
    const currentPageActiveProductIds = products
      .filter(p => p.is_active) // Filter for active products
      .map(p => p.product_id);
    onSelectAllProducts(currentPageActiveProductIds, isChecked);
  };

  // Calculate if all *active* products on the current page are selected
  let isAllActiveOnPageSelectedValue = false;
  if (!isLoading && products.length > 0) {
    const activeProductsOnPage = products.filter(p => p.is_active);
    if (activeProductsOnPage.length > 0) {
      isAllActiveOnPageSelectedValue = activeProductsOnPage.every(p => selectedProductIds.includes(p.product_id));
    }
  }


  // Skeleton Loading (existing code is fine)
  if (isLoading && products.length === 0) {
    // ... your existing skeleton JSX ...
    return (
        <div className="overflow-x-auto bg-base-100 rounded-lg shadow-sm">
            <table className="table w-full">
                <thead>
                    <tr className="text-xs uppercase text-base-content/70">
                        <th className="w-10 p-2 hidden sm:table-cell"><input type="checkbox" className="checkbox checkbox-xs checkbox-neutral" disabled /></th>
                        <th className="p-3">Product</th>
                        <th className="p-3 hidden md:table-cell">Category</th>
                        <th className="p-3 text-center hidden sm:table-cell">Qty</th>
                        <th className="p-3">Price</th>
                        <th className="p-3 hidden lg:table-cell">Condition</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {[...Array(5)].map((_, index) => (
                        <tr key={`skel-${index}`} className="animate-pulse">
                            <td className="p-2 hidden sm:table-cell"><div className="h-4 w-4 bg-base-300 rounded"></div></td>
                            <td className="p-3">
                                <div className="flex items-center space-x-3">
                                    <div className="avatar hidden sm:flex"><div className="mask mask-squircle w-10 h-10 bg-base-300"></div></div>
                                    <div>
                                        <div className="h-4 w-32 bg-base-300 rounded mb-1"></div>
                                        <div className="h-3 w-16 bg-base-300 rounded"></div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-3 hidden md:table-cell"><div className="h-4 w-20 bg-base-300 rounded"></div></td>
                            <td className="p-3 text-center hidden sm:table-cell"><div className="h-4 w-8 bg-base-300 rounded mx-auto"></div></td>
                            <td className="p-3"><div className="h-4 w-12 bg-base-300 rounded"></div></td>
                            <td className="p-3 hidden lg:table-cell"><div className="h-4 w-16 bg-base-300 rounded"></div></td>
                            <td className="p-3 text-center"><div className="h-5 w-14 bg-base-300 rounded-full mx-auto"></div></td>
                            <td className="p-3 text-center"><div className="h-6 w-16 bg-base-300 rounded mx-auto"></div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
  }

  // Main Table Render
  return (
    <div className="overflow-x-auto bg-base-100 rounded-lg shadow-sm">
      <table className="table w-full table-zebra-zebra">
        <thead className="bg-base-200/50">
          <tr className="text-xs uppercase text-base-content/70">
            <th className="w-10 p-2 hidden sm:table-cell">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-primary"
                checked={isAllActiveOnPageSelectedValue}
                onChange={handleSelectAllClick}
                disabled={products.filter(p => p.is_active).length === 0 || isLoading} // Disable if no active products
              />
            </th>
            <th className="p-3">Product</th>
            <th className="p-3 hidden md:table-cell">Category</th>
            <th className="p-3 text-center hidden sm:table-cell">Qty</th>
            <th className="p-3">Price</th>
            <th className="p-3 hidden lg:table-cell">Condition</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
            const priceDisplay = `$${parseFloat(product.original_price || 0).toFixed(2)}`;
            const isSelected = selectedProductIds.includes(product.product_id);

            return (
              <tr key={product.product_id} className={`hover:bg-primary/5 transition-colors ${isSelected ? '!bg-primary/10' : ''}`}>
                <td className="p-2 hidden sm:table-cell">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs checkbox-primary"
                    checked={isSelected}
                    onChange={() => onSelectProduct(product.product_id)}
                    disabled={isLoading || !product.is_active}
                  />
                </td>
                <td className="p-3">
                  {/* ... existing product title and image display ... */}
                  <div className="flex items-center space-x-3">
                    <div className="avatar hidden sm:flex shrink-0">
                      <div className="mask mask-squircle w-10 h-10 bg-base-300">
                        {primaryImage?.image_url ? (
                          <img src={primaryImage.image_url} alt={product.title} className="object-cover"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base-content/30 text-lg">?</div>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <button onClick={() => onEdit(product)} className="font-semibold text-sm text-base-content hover:text-primary transition-colors text-left hover:underline truncate block" title={product.title}>
                        {product.title}
                      </button>
                      {product.FeaturedInStreams && product.FeaturedInStreams.length > 0 && (
                        <div className="text-xs text-base-content/70 mt-0.5 flex items-center gap-1 truncate">
                          <FiTv size={12} className="text-secondary shrink-0"/>
                          <span className="font-medium truncate" title={product.FeaturedInStreams.map(s => s.title).join(', ')}>
                            In: {product.FeaturedInStreams.map(s => s.title).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden md:table-cell text-sm text-base-content/80">{product.Category?.name || <span className="opacity-50">-</span>}</td>
                <td className="p-3 text-center hidden sm:table-cell text-sm text-base-content/80">
                  {product.quantity !== undefined ? product.quantity : <span className="opacity-50">-</span>}
                </td>
                <td className="p-3">
                  <div className="text-sm font-medium text-base-content">{priceDisplay}</div>
                </td>
                <td className="p-3 hidden lg:table-cell text-sm text-base-content/80 capitalize">{product.condition || <span className="opacity-50">-</span>}</td>
                <td className="p-3 text-center">
                  {/* MODIFIED: Status badge logic */}
                  <span className={`badge badge-sm font-medium ${product.is_active ? 'badge-success badge-outline' : 'badge-error'}`}>
                    {product.is_active ? 'Active' : 'Sold'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-xs m-1 normal-case">Actions ▼</label>
                    <ul tabIndex={0} className="dropdown-content z-[10] menu menu-xs p-1 shadow bg-base-100 rounded-box w-32 border border-base-300">
                      <li>
                        <button onClick={() => onEdit(product)} className="flex items-center w-full text-left hover:bg-base-200 p-1.5 rounded ">
                          <FiEdit className="inline mr-1.5"/> Edit {/* Consider disabling Edit if !product.is_active */}
                        </button>
                      </li>
                      <li>
                        <button onClick={() => onDelete(product)} className="flex items-center w-full text-left hover:bg-error/10 text-error p-1.5 rounded ">
                          <FiTrash2 className="inline mr-1.5"/> Delete {/* Consider disabling Delete if !product.is_active, or archive */}
                        </button>
                      </li>
                    </ul>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;