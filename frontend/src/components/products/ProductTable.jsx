// src/components/products/ProductTable.jsx
import React from 'react';
import { FiEdit, FiTrash2, FiEye } from 'react-icons/fi'; // Assume FiEye for view product
import { Link } from 'react-router-dom';

const ProductTable = ({ products, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto bg-base-100 rounded-lg shadow-sm"> {/* Added shadow and rounded for card-like feel */}
      <table className="table w-full">
        <thead>
          <tr className="text-xs uppercase text-base-content/70">
            <th className="w-10 p-2 hidden sm:table-cell"><input type="checkbox" className="checkbox checkbox-xs checkbox-neutral" /></th>
            <th className="p-3">Product</th>
            <th className="p-3 hidden md:table-cell">Category</th>
            <th className="p-3 text-center hidden sm:table-cell">Quantity</th>
            <th className="p-3">Price & Format</th>
            <th className="p-3 hidden lg:table-cell">Condition</th>
            <th className="p-3 hidden lg:table-cell">Featured In</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const primaryImage = product.images?.find(img => img.is_primary) || product.images?.[0];
            const format = "Buy It Now"; // Placeholder
            const priceDisplay = `$${parseFloat(product.original_price || 0).toFixed(2)}`;

            return (
              <tr key={product.product_id} className="hover:bg-base-200/50 transition-colors">
                <td className="p-2 hidden sm:table-cell"><input type="checkbox" className="checkbox checkbox-xs checkbox-neutral" /></td>
                <td className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="avatar hidden tiểu:flex"> {/* 'tiểu' likely means 'sm' or for smaller sizes, using sm for now */}
                      <div className="mask mask-squircle w-10 h-10 bg-base-300">
                        {primaryImage?.image_url ? (
                          <img src={primaryImage.image_url} alt={product.title} className="object-cover"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base-content/30 text-lg">?</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-base-content hover:text-primary transition-colors">
                        <Link to={`/dashboard/inventory/edit/${product.product_id}`} state={{ product }}>{product.title}</Link>
                      </div>
                      <div className={`text-xs opacity-70 ${product.is_active ? 'text-success' : 'text-error'}`}>
                        {product.is_active ? 'Active' : (product.is_draft ? 'Draft' : 'Inactive')} {/* Add is_draft logic */}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden md:table-cell text-sm text-base-content/80">{product.Category?.name || 'N/A'}</td>
                <td className="p-3 text-center hidden sm:table-cell text-sm text-base-content/80">
                  {product.quantity !== undefined ? product.quantity : <span className="opacity-50">-</span>}
                </td>
                <td className="p-3">
                  <div className="text-sm font-medium text-base-content">{priceDisplay}</div>
                  <div className="text-xs opacity-70">{format}</div>
                </td>
                <td className="p-3 hidden lg:table-cell text-sm text-base-content/80 capitalize">{product.condition || 'N/A'}</td>
                <td className="p-3 hidden lg:table-cell text-sm text-base-content/60">
                    {/* Placeholder - e.g., link to shows */}
                    -
                </td>
                <td className="p-3 text-center">
                  <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-xs m-1">Actions ▼</label>
                    <ul tabIndex={0} className="dropdown-content z-[1] menu menu-xs p-1 shadow bg-base-100 rounded-box w-32">
                      <li><button onClick={() => onEdit(product)} className="w-full text-left hover:bg-base-200 p-1.5 rounded text-info"><FiEdit className="inline mr-1"/> Edit</button></li>
                      <li><button onClick={() => onDelete(product)} className="w-full text-left hover:bg-base-200 p-1.5 rounded text-error"><FiTrash2 className="inline mr-1"/> Delete</button></li>
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