// frontend/src/components/stream/StreamProductList.jsx
import React, { useState, useMemo } from 'react';
import { FiSearch, FiShoppingBag } from 'react-icons/fi'; // <-- Added FiShoppingBag

const ProductItem = ({ product, onProductClick }) => {
  // Backend's getProductsByUserId returns products with 'title' and 'original_price'.
  // It also includes an 'images' array.
  const displayName = product.title;
  const displayPrice = product.original_price;
  const primaryImage = product.images?.find(img => img.is_primary)?.image_url || product.images?.[0]?.image_url;

  return (
    <div 
      className="p-3 border-b border-neutral-800 hover:bg-neutral-800/50 cursor-pointer"
      onClick={() => onProductClick(product)}
    >
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-md bg-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
          {primaryImage ? (
            <img 
              src={primaryImage} 
              alt={displayName} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <FiShoppingBag className="w-8 h-8 text-neutral-500" /> // Placeholder icon
          )}
        </div>
        <div className="flex-grow min-w-0">
          <h4 className="text-sm font-semibold text-white leading-tight mb-0.5 line-clamp-2">{displayName}</h4>
          {product.condition && <p className="text-xs text-neutral-500 mb-1 line-clamp-1 capitalize">{product.condition.replace(/_/g, " ")}</p>}
          {displayPrice && <p className="text-sm font-bold text-yellow-400">${parseFloat(displayPrice).toFixed(2)}</p>}
        </div>
      </div>
    </div>
  );
};

const StreamProductList = ({ streamTitle, products = [] }) => {
  const [activeTab, setActiveTab] = useState('buyNow'); // Default to 'buyNow'
  const [searchTerm, setSearchTerm] = useState('');

  const handleProductItemClick = (product) => {
    console.log("Buy Now Product clicked:", product);
    // TODO: Implement action for "Buy Now" product click (e.g., show details, add to cart)
  };
  
  const buyNowProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    // Filter for active products to be shown in "Buy Now"
    // Your backend's getProductsByUserId already filters by is_active: true if it's for public view
    // If not, you might need to add a filter here: products.filter(p => p.is_active)
    return products; 
  }, [products]);

  const filteredDisplayProducts = useMemo(() => {
    let sourceProducts = [];
    if (activeTab === 'buyNow') {
      sourceProducts = buyNowProducts;
    } else if (activeTab === 'auction') {
      // For auction tab, you'd likely get data from `currentAuction.Product` if an auction is active.
      // Or, if you want to list items designated for auction but not yet active:
      // sourceProducts = products.filter(p => p.isDesignatedForAuction); // Example
      sourceProducts = []; 
    } else if (activeTab === 'sold') {
      sourceProducts = []; // Needs a separate data source for sold items
    }
    
    if (!searchTerm) return sourceProducts;
    return sourceProducts.filter(p =>
      p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [buyNowProducts, searchTerm, activeTab]);


  let noProductMessage = "No products found.";
  if (activeTab === 'buyNow') {
    noProductMessage = searchTerm ? `No products for sale found matching "${searchTerm}".` : "Streamer has no products listed for sale.";
  } else if (activeTab === 'auction') {
    noProductMessage = "No items currently listed for auction in this panel.";
  } else if (activeTab === 'sold') {
    noProductMessage = "No products have been sold in this stream yet.";
  }

  const TabButton = ({ name, label, count }) => (
    <button
      onClick={() => setActiveTab(name)}
      className={`py-2.5 px-1 text-sm font-medium border-b-2 transition-colors duration-150 w-full
                  ${activeTab === name
                    ? 'border-yellow-400 text-yellow-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
    >
      {label} {count !== undefined ? `(${count})` : ''}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-neutral-800 shrink-0">
        <h2 className="text-lg font-bold text-white leading-tight line-clamp-2">{streamTitle}</h2>
      </div>

      <div className="flex justify-around items-center px-2 border-b border-neutral-800 shrink-0">
        {/* Pass buyNowProducts.length for the count of Buy Now items */}
        <TabButton name="buyNow" label="Buy Now" count={buyNowProducts.length} /> 
        <TabButton name="auction" label="Auction" count={activeTab === 'auction' ? filteredDisplayProducts.length : 0} />
        <TabButton name="sold" label="Sold" count={activeTab === 'sold' ? filteredDisplayProducts.length : 0} />
      </div>
      
      {(activeTab === 'buyNow' && buyNowProducts.length > 0) && (
        <div className="p-3 shrink-0">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-sm w-full bg-neutral-800 border-neutral-700 rounded-lg pl-9 focus:border-yellow-500 placeholder-neutral-500"
            />
          </div>
        </div>
      )}

      {/* Show product count based on the currently filtered list for the active tab */}
      <div className="px-3 text-xs text-neutral-400 mb-1 shrink-0">
        {filteredDisplayProducts.length > 0 ? `${filteredDisplayProducts.length} Product(s)` : ''}
        {filteredDisplayProducts.length > 0 && searchTerm && ` matching "${searchTerm}"`}
      </div>
      <div className="flex-grow overflow-y-auto">
        {filteredDisplayProducts.length > 0 ? (
          filteredDisplayProducts.map(product => (
            <ProductItem 
                key={product.product_id} 
                product={product} 
                onProductClick={handleProductItemClick}
            />
          ))
        ) : (
          <p className="text-center text-sm text-neutral-500 p-6">{noProductMessage}</p>
        )}
      </div>
    </div>
  );
};

export default StreamProductList;