// src/pages/dashboard/InventoryPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getLoggedInUserProducts, deleteProduct } from '../../services/productService';
import ProductTable from '../../components/products/ProductTable'; // Will adapt this
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal';
import { FiPlus, FiSearch, FiChevronLeft, FiChevronRight, FiFilter } from 'react-icons/fi'; // Updated icons

// Sub-component for the product list view
const ProductListView = ({ products, onEdit, onDelete, isLoading, activeFilter }) => {
    if (isLoading) {
        return <div className="flex justify-center items-center p-20"><span className="loading loading-lg loading-ball text-primary"></span></div>;
    }

    let displayProducts = products;
    if (activeFilter === 'active') {
        displayProducts = products.filter(p => p.is_active);
    } else if (activeFilter === 'drafts') {
        // Assuming drafts are products that are !is_active and maybe have a specific 'draft' status if you add one
        displayProducts = products.filter(p => !p.is_active); // Simple example
    } else if (activeFilter === 'inactive') {
        displayProducts = products.filter(p => !p.is_active); // Or a more specific "inactive" status
    }


    if (!displayProducts || displayProducts.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-base-100 rounded-lg shadow-sm mt-6">
                <img src="/images/dashboard/mr-sparkle-empty.png" alt="Nothing here" className="w-24 h-auto mx-auto mb-6 opacity-70" /> {/* Replace with your mascot image */}
                <h3 className="text-xl font-semibold text-base-content mb-2">There's nothing here at the moment!</h3>
                <p className="text-base-content/70">When you add products as <span className="font-medium">{activeFilter}</span>, they'll appear here.</p>
            </div>
        );
    }
    return <ProductTable products={displayProducts} onEdit={onEdit} onDelete={onDelete} />;
};


const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('active'); // 'active', 'drafts', 'inactive'

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const userProducts = await getLoggedInUserProducts();
      setProducts(userProducts || []);
    } catch (err) {
      setGlobalError(err.message || 'Failed to load inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenEditProduct = (product) => {
    navigate(`/dashboard/inventory/edit/${product.product_id}`, { state: { product } });
  };

  const handleOpenDeleteModal = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => { /* ... */ setIsDeleteModalOpen(false); setProductToDelete(null); };
  const handleConfirmDelete = async () => { /* ... (same as before) ... */
    if (!productToDelete) return;
    setIsDeleting(true); setGlobalError(null);
    try {
        await deleteProduct(productToDelete.product_id);
        fetchProducts(); handleCloseDeleteModal();
    } catch (err) { setGlobalError(err.message || 'Failed to delete product.'); }
    finally { setIsDeleting(false); }
  };


  const filteredProductsBySearch = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const TabButton = ({ filterValue, label }) => (
    <button
        className={`tab tab-lg ${activeFilter === filterValue ? 'tab-active !border-primary !text-primary font-semibold' : 'hover:text-base-content/90'}`}
        onClick={() => setActiveFilter(filterValue)}
    >
        {label}
    </button>
  );

  // Pagination state (simple example)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // Default to 20 as in screenshot

  // Apply filter first, then search, then paginate
  let processedProducts = products;
  if (activeFilter === 'active') processedProducts = processedProducts.filter(p => p.is_active);
  else if (activeFilter === 'drafts') processedProducts = processedProducts.filter(p => !p.is_active /* and draft_status true */); // Add draft logic
  else if (activeFilter === 'inactive') processedProducts = processedProducts.filter(p => !p.is_active /* and draft_status false */);

  const finalFilteredProducts = processedProducts.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = finalFilteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(finalFilteredProducts.length / itemsPerPage);


  return (
    <div className="space-y-6 p-0 md:p-0"> {/* Removed outer padding, handled by DashboardPage */}
      {/* Top Bar: Title, Filters, Create Button */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-1 pb-4 border-b border-base-300">
        <h1 className="text-2xl font-semibold text-base-content hidden md:block">Inventory</h1>
        {/* Tabs for Active, Drafts, Inactive */}
        <div className="tabs tabs-sm md:tabs-md">
            <TabButton filterValue="active" label="Active" />
            <TabButton filterValue="drafts" label="Drafts" />
            <TabButton filterValue="inactive" label="Inactive" />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="btn btn-ghost btn-sm btn-square p-0 md:hidden"> {/* Hamburger for user menu/notifications on mobile for dashboard */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
             <Link to="/dashboard/inventory/create" className="btn btn-primary btn-sm md:btn-md normal-case flex-grow md:flex-none bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400">
                Create Product
            </Link>
            {/* User avatar icon - for mobile, could trigger right panel */}
            <button className="btn btn-ghost btn-circle avatar md:hidden">
                <div className="w-8 rounded-full bg-neutral-focus text-neutral-content">
                    <span>U</span> {/* Placeholder */}
                </div>
            </button>
        </div>
      </div>

      {/* Search and Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-2 bg-base-100 p-3 rounded-lg shadow-sm">
        <div className="form-control">
          <label className="label cursor-pointer gap-2 py-1 hidden sm:flex"> {/* Hide checkbox on very small screens */}
            <input type="checkbox" className="checkbox checkbox-sm checkbox-neutral" />
            {/* <span className="label-text text-sm">Select All</span> */}
          </label>
        </div>
        <div className="relative flex-grow w-full sm:w-auto">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
          <input
            type="search"
            placeholder="Search Products"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-sm input-bordered w-full pl-9 focus:border-primary"
          />
        </div>
        <button className="btn btn-ghost btn-sm text-base-content/70 hidden sm:inline-flex items-center gap-1.5">
            <FiFilter size={14}/> Filter
        </button>
      </div>


      {globalError && (
         <div role="alert" className="alert alert-error my-4"> {/* Added my-4 for margin */}
            <FiAlertCircle className="w-6 h-6" /> {/* Display icon */}
            <span>Error: {globalError}</span>
            {/* Optional: Add a dismiss button for the error */}
            {/* <button className="btn btn-xs btn-ghost" onClick={() => setGlobalError(null)}>✕</button> */}
         </div>
      )}
      <ProductListView
        products={currentItems} // Pass paginated items
        onEdit={handleOpenEditProduct}
        onDelete={handleOpenDeleteModal}
        isLoading={isLoading}
        activeFilter={activeFilter}
      />

      {/* Pagination Controls */}
      {finalFilteredProducts.length > itemsPerPage && (
        <div className="flex justify-between items-center mt-6 text-sm bg-base-100 p-3 rounded-lg shadow-sm">
            <div>
                <span className="mr-2">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, finalFilteredProducts.length)} of {finalFilteredProducts.length}</span>
            </div>
            <div className="join">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="join-item btn btn-sm btn-ghost"
                    disabled={currentPage === 1}
                >
                    <FiChevronLeft />
                </button>
                {/* Consider more advanced pagination if many pages */}
                <button className="join-item btn btn-sm btn-ghost">Page {currentPage} of {totalPages}</button>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="join-item btn btn-sm btn-ghost"
                    disabled={currentPage === totalPages}
                >
                    <FiChevronRight />
                </button>
            </div>
            <div className="hidden sm:flex items-center">
                <span className="mr-2">Show</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}}
                    className="select select-bordered select-sm focus:border-primary"
                >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                </select>
            </div>
        </div>
      )}


      <DeleteConfirmationModal /* ... (same as before) ... */ />
    </div>
  );
};

export default InventoryPage;