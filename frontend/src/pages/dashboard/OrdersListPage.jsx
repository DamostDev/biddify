import React, { useState, useEffect, useCallback } from 'react';
// No useNavigate needed here if actions are within modals or current page
import orderService from '../../services/orderService';
import OrderTable from '../../components/orders/OrderTable';
import UpdateOrderStatusModal from '../../components/orders/UpdateOrderStatusModal'; // Import
import OrderDetailsModal from '../../components/orders/OrderDetailsModal';       // Import
import { FiShoppingCart, FiDollarSign, FiAlertCircle, FiInbox, FiRefreshCw } from 'react-icons/fi';

const OrdersListPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRole, setFilterRole] = useState('seller');

  // State for Modals
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { role: filterRole };
      const data = await orderService.getMyOrders(params);
      setOrders(data || []);
    } catch (err) {
      setError(err.message || `Failed to load ${filterRole} orders.`);
    } finally {
      setIsLoading(false);
    }
  }, [filterRole]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenUpdateStatusModal = (order) => {
    // Logic to determine if current user can update this order's status might be needed
    // For now, assuming seller perspective allows updating based on current status
    setSelectedOrderForStatus(order);
    setIsStatusModalOpen(true);
  };

  const handleOpenDetailsModal = (order) => {
    // Fetch full order details if needed, or use the one from the list if sufficient
    // For now, using the list data. For more complex details, you might fetch by ID.
    setSelectedOrderForDetails(order);
    setIsDetailsModalOpen(true);
  };

  const handleStatusUpdateSuccess = (updatedOrder) => {
    fetchOrders(); // Refresh the list after a successful status update
    // Optionally update the order in selectedOrderForDetails if it's the same one
    if (selectedOrderForDetails && selectedOrderForDetails.order_id === updatedOrder.order_id) {
        setSelectedOrderForDetails(updatedOrder);
    }
  };
  
  const handleShippingUpdateSuccess = (updatedOrder) => {
    fetchOrders(); // Refresh list
    // Update the order in selectedOrderForDetails if it's the currently viewed one
    if (selectedOrderForDetails && selectedOrderForDetails.order_id === updatedOrder.order_id) {
        setSelectedOrderForDetails(updatedOrder);
    }
  };


  const TabButton = ({ roleValue, label, icon }) => (
    <button
        className={`tab tab-lg gap-2 ${filterRole === roleValue ? 'tab-active !border-primary !text-primary font-semibold' : 'hover:text-base-content/90'}`}
        onClick={() => { setFilterRole(roleValue); /* fetchOrders will be called by useEffect */}}
    >
        {React.createElement(icon, {className: "w-5 h-5"})}
        {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-1 pb-4 border-b border-base-300">
        <h1 className="text-2xl font-semibold text-base-content">
          {filterRole === 'seller' ? 'My Sales' : 'My Purchases'}
        </h1>
        <div className="tabs tabs-boxed tabs-sm bg-base-200 p-1">
            <TabButton roleValue="seller" label="Selling" icon={FiDollarSign} />
            <TabButton roleValue="buyer" label="Buying" icon={FiShoppingCart} />
        </div>
      </div>

      {error && (
        <div role="alert" className="alert alert-error my-4 shadow-md">
          <FiAlertCircle className="w-6 h-6" />
          <span>{error}</span>
          <button className="btn btn-xs btn-ghost" onClick={fetchOrders}><FiRefreshCw className="mr-1"/>Retry</button>
        </div>
      )}

      {(!isLoading && orders.length === 0 && !error) ? (
         <div className="text-center py-16 px-6 bg-base-100 rounded-lg shadow-sm mt-6 border border-base-300/30">
             <FiInbox size={48} className="text-base-content/30 mx-auto mb-4" />
             <h3 className="text-xl font-semibold text-base-content mb-2">
                No {filterRole === 'seller' ? 'sales' : 'purchases'} found.
             </h3>
             <p className="text-base-content/70">
                {filterRole === 'seller' ? 'When you make sales, they will appear here.' : 'Your purchased items will be listed here.'}
             </p>
         </div>
      ) : (
        <OrderTable
          orders={orders}
          isLoading={isLoading}
          onUpdateStatusClick={handleOpenUpdateStatusModal} // Changed to open modal
          onViewDetails={handleOpenDetailsModal}         // Changed to open modal
          userRolePerspective={filterRole}
        />
      )}

      {selectedOrderForStatus && (
        <UpdateOrderStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          order={selectedOrderForStatus}
          onStatusUpdateSuccess={handleStatusUpdateSuccess}
        />
      )}

      {selectedOrderForDetails && (
        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          orderData={selectedOrderForDetails} // Pass the order data
          onUpdateShipping={handleShippingUpdateSuccess}
        />
      )}
    </div>
  );
};

export default OrdersListPage;