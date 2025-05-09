import React, { useState } from 'react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';

const ProductItem = ({ product }) => (
  <div className="p-3 border-b border-neutral-800 hover:bg-neutral-800/50 cursor-pointer">
    <h4 className="text-sm font-semibold text-white leading-tight mb-0.5 line-clamp-2">{product.name}</h4>
    <p className="text-xs text-neutral-400 mb-0.5">{product.available} Available</p>
    <p className="text-xs text-neutral-500 mb-1 line-clamp-1">{product.condition}</p>
    <p className="text-sm font-bold text-yellow-400">{product.price}</p>
  </div>
);

const StreamProductList = ({ streamTitle, products }) => {
  const [activeTab, setActiveTab] = useState('auction');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const TabButton = ({ name, label }) => (
    <button
      onClick={() => setActiveTab(name)}
      className={`py-2.5 px-1 text-sm font-medium border-b-2 transition-colors duration-150
                  ${activeTab === name
                    ? 'border-yellow-400 text-yellow-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Stream Title Area */}
      <div className="p-4 border-b border-neutral-800 shrink-0">
        <h2 className="text-lg font-bold text-white leading-tight line-clamp-2">{streamTitle}</h2>
        {/* Add tags or category here if available */}
      </div>

      {/* Tabs: Auction, Buy Now, etc. */}
      <div className="flex justify-around items-center px-2 border-b border-neutral-800 shrink-0">
        <TabButton name="auction" label="Auction" />
        <TabButton name="buyNow" label="Buy Now" />
        <TabButton name="giveaways" label="Giveaways" />
        <TabButton name="sold" label="Sold" />
      </div>
      <div className="flex justify-around items-center px-2 border-b border-neutral-800 shrink-0 mb-2">
        <TabButton name="purchased" label="Purchased" />
        <TabButton name="tips" label="Tips" />
        <div className="flex-1"></div> {/* Spacer */}
      </div>


      {/* Search Products */}
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

      {/* Product Count and List */}
      <div className="px-3 text-xs text-neutral-400 mb-1 shrink-0">
        {filteredProducts.length} Products
      </div>
      <div className="flex-grow overflow-y-auto">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => <ProductItem key={product.id} product={product} />)
        ) : (
          <p className="text-center text-sm text-neutral-500 p-6">No products found matching "{searchTerm}".</p>
        )}
      </div>
    </div>
  );
};

export default StreamProductList;