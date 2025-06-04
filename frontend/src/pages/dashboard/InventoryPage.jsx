// frontend/src/pages/dashboard/InventoryPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLoggedInUserProducts, deleteProduct as apiDeleteProduct } from '../../services/productService';
import ProductTable from '../../components/products/ProductTable';
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal';
import AssignToStreamModal from '../../components/products/AssignToStreamModal';
import { FiPlus, FiSearch, FiChevronLeft, FiChevronRight, FiTv, FiAlertCircle, FiInbox, FiList } from 'react-icons/fi';

const InventoryPage = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'inactive'

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const navigate = useNavigate();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const userProducts = await getLoggedInUserProducts(); // This should fetch products with their 'FeaturedInStreams'
      setAllProducts(userProducts || []);
    } catch (err) {
      setGlobalError(err.response?.data?.message || err.message || 'Failed to load inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenEditProduct = (product) => {
    navigate(`/dashboard/inventory/edit/${product.product_id}`);
  };

  const handleOpenDeleteModal = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => { setIsDeleteModalOpen(false); setProductToDelete(null); };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true); setGlobalError(null);
    try {
        await apiDeleteProduct(productToDelete.product_id);
        fetchProducts();
        setSelectedProductIds(prev => prev.filter(id => id !== productToDelete.product_id));
        handleCloseDeleteModal();
    } catch (err) { setGlobalError(err.response?.data?.message || err.message || 'Failed to delete product.'); }
    finally { setIsDeleting(false); }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProductIds(prevSelected =>
      prevSelected.includes(productId)
        ? prevSelected.filter(id => id !== productId)
        : [...prevSelected, productId]
    );
  };

  // Handles selecting/deselecting all products currently visible on the page
  const handleSelectAllCurrentPageProducts = (currentPageProductIds, isChecked) => {
    if (isChecked) {
      // Add all current page IDs to selection, avoiding duplicates
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...currentPageProductIds])));
    } else {
      // Remove all current page IDs from selection
      setSelectedProductIds(prev => prev.filter(id => !currentPageProductIds.includes(id)));
    }
  };

  const TabButton = ({ filterValue, label, count }) => (
    <button
        className={`tab tab-lifted sm:tab-lg ${activeFilter === filterValue ? 'tab-active !border-primary !text-primary font-semibold' : 'hover:text-base-content/90'}`}
        onClick={() => { setActiveFilter(filterValue); setCurrentPage(1); setSelectedProductIds([]); }}
    >
        {label} {count > 0 && <div className="badge badge-sm badge-ghost ml-1.5">{count}</div>}
    </button>
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtering Logic
  const filteredByStatus = allProducts.filter(p => {
    if (activeFilter === 'active') return p.is_active;
    if (activeFilter === 'inactive') return !p.is_active;
    return true; // 'all'
  });

  const searchedProducts = filteredByStatus.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItemsOnPage = searchedProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(searchedProducts.length / itemsPerPage);

  const countByStatus = (status) => {
    if (status === 'all') return allProducts.length;
    if (status === 'active') return allProducts.filter(p => p.is_active).length;
    if (status === 'inactive') return allProducts.filter(p => !p.is_active).length;
    return 0;
  };

  return (
    <div className="space-y-6 p-0 md:p-0"> {/* Outer padding handled by DashboardPage */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-1 pb-2 border-b border-base-300">
        <h1 className="text-2xl font-semibold text-base-content hidden md:block">My Inventory</h1>
        <div className="tabs tabs-sm md:tabs-md w-full md:w-auto justify-center md:justify-start">
            <TabButton filterValue="all" label="All" count={countByStatus('all')} />
            <TabButton filterValue="active" label="Active" count={countByStatus('active')} />
            <TabButton filterValue="inactive" label="Inactive" count={countByStatus('inactive')} />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
             <Link to="/dashboard/inventory/create" className="btn btn-primary btn-sm md:btn-md normal-case flex-grow md:flex-none">
                <FiPlus className="mr-1 hidden sm:inline" /> Create Product
            </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-2 bg-base-100 p-3 rounded-lg shadow-sm border border-base-300/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedProductIds.length > 0 ? (
            <>
              <span className="text-sm font-medium text-primary">{selectedProductIds.length} selected</span>
              <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="btn btn-outline btn-secondary btn-xs normal-case"
              >
                  <FiTv className="mr-1" /> Add to Stream
              </button>
              {/* You can add more bulk actions here */}
              {/* <button className="btn btn-outline btn-error btn-xs normal-case">Bulk Delete</button> */}
            </>
          ) : (
            <span className="text-sm text-base-content/60 hidden sm:block">Select products for bulk actions.</span>
          )}
        </div>

        <div className="relative flex-grow w-full sm:w-auto sm:max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
          <input
            type="search"
            placeholder="Search your products..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="input input-sm input-bordered w-full pl-9 focus:border-primary"
          />
        </div>
      </div>

      {globalError && (
         <div role="alert" className="alert alert-error my-4 shadow-md">
            <FiAlertCircle className="w-6 h-6" />
            <span>Error: {globalError}</span>
         </div>
      )}

      {(isLoading && currentItemsOnPage.length === 0) ? (
         <ProductTable products={[]} isLoading={true} selectedProductIds={[]} onSelectProduct={()=>{}} onSelectAllProducts={()=>{}} />
      ) : currentItemsOnPage.length === 0 && !isLoading ? (
         <div className="text-center py-16 px-6 bg-base-100 rounded-lg shadow-sm mt-6 border border-base-300/30">
             <FiInbox size={48} className="text-base-content/30 mx-auto mb-4" />
             <h3 className="text-xl font-semibold text-base-content mb-2">
                {searchTerm ? 'No products match your search.' : `No ${activeFilter !== 'all' ? activeFilter : ''} products found.`}
             </h3>
             <p className="text-base-content/70">
                {searchTerm ? 'Try adjusting your search term or filter.' : 'Why not add some new products?'}
             </p>
             {!searchTerm && activeFilter === 'all' && (
                 <Link to="/dashboard/inventory/create" className="btn btn-primary btn-sm mt-4">
                     <FiPlus className="mr-1"/> Add First Product
                 </Link>
             )}
         </div>
      ) : (
        <ProductTable
            products={currentItemsOnPage}
            onEdit={handleOpenEditProduct}
            onDelete={handleOpenDeleteModal}
            isLoading={isLoading}
            selectedProductIds={selectedProductIds}
            onSelectProduct={handleSelectProduct}
            onSelectAllProducts={handleSelectAllCurrentPageProducts}
        />
      )}


      {searchedProducts.length > itemsPerPage && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 text-sm bg-base-100 p-3 rounded-lg shadow-sm border border-base-300/50">
            <div className="mb-2 sm:mb-0">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, searchedProducts.length)} of {searchedProducts.length} results
            </div>
            <div className="join mb-2 sm:mb-0">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="join-item btn btn-sm btn-outline"
                    disabled={currentPage === 1}
                > <FiChevronLeft /> Prev </button>
                <button className="join-item btn btn-sm btn-outline pointer-events-none">Page {currentPage} of {totalPages}</button>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="join-item btn btn-sm btn-outline"
                    disabled={currentPage === totalPages}
                > Next <FiChevronRight /> </button>
            </div>
            <div className="flex items-center">
                <span className="mr-2">Show:</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}}
                    className="select select-bordered select-xs focus:border-primary" // select-xs for smaller
                >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                </select>
                 <span className="ml-1">per page</span>
            </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        itemName={productToDelete?.title || 'this product'}
        isProcessing={isDeleting} // Renamed prop for clarity
      />
      <AssignToStreamModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedProductIds={selectedProductIds}
        onAssignSuccess={() => {
            fetchProducts(); // Refresh products
            setSelectedProductIds([]); // Clear selection
            setIsAssignModalOpen(false);
        }}
      />
    </div>
  );
};

export default InventoryPage;