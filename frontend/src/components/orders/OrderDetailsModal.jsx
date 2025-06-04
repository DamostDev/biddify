import React, { useState, useEffect } from 'react';
import { FiX, FiUser, FiMapPin, FiShoppingCart, FiDollarSign, FiPackage, FiInfo, FiEdit } from 'react-icons/fi';
import { format } from 'date-fns';
import orderService from '../../services/orderService'; // If you need to fetch full details again or update parts

const OrderDetailsModal = ({ isOpen, onClose, orderData, onUpdateShipping }) => {
  const [order, setOrder] = useState(null);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    line1: '', city: '', postal_code: '', state: '', country: 'US', // Default country
  });

  useEffect(() => {
    if (orderData) {
      setOrder(orderData); // Assuming orderData passed from parent is complete enough
      if (orderData.shipping_address) {
        setShippingAddress(orderData.shipping_address);
      } else {
        setShippingAddress({ line1: '', city: '', postal_code: '', state: '', country: 'US' });
      }
    }
    setIsEditingShipping(false); // Reset editing state
  }, [orderData, isOpen]);

  const handleShippingChange = (e) => {
    setShippingAddress(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveShipping = async () => {
    if (!order) return;
    try {
        // TODO: Add validation for shipping address fields
        const updatedOrder = await orderService.updateShippingAddress(order.order_id, shippingAddress);
        setOrder(updatedOrder); // Update local order state
        setIsEditingShipping(false);
        if(onUpdateShipping) onUpdateShipping(updatedOrder); // Notify parent
        alert("Shipping address updated!");
    } catch (error) {
        alert("Failed to update shipping address: " + error.message);
    }
  };


  if (!isOpen || !order) return null;

  const product = order.Auction?.Product;
  const primaryImage = product?.images?.find(img => img.is_primary) || product?.images?.[0];

  return (
    <dialog id="order_details_modal" className="modal modal-open modal-bottom sm:modal-middle">
      <div className="modal-box w-11/12 max-w-2xl">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        <h3 className="font-bold text-xl mb-1">Order Details</h3>
        <p className="text-sm text-base-content/70 mb-4 font-mono">ID: #{order.order_id}</p>

        <div className="space-y-4">
          {/* Product Info */}
          {product && (
            <div className="card card-compact bg-base-200/50 shadow-sm">
              <div className="card-body">
                <h4 className="card-title text-base flex items-center gap-2"><FiShoppingCart /> Product Details</h4>
                <div className="flex gap-4 items-start">
                  <div className="avatar shrink-0">
                    <div className="w-20 h-20 rounded-lg bg-base-300">
                      {primaryImage?.image_url ? (
                        <img src={primaryImage.image_url} alt={product.title} className="object-cover"/>
                      ) : <FiPackage className="w-10 h-10 text-base-content/40 m-auto"/>}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-base-content">{product.title}</p>
                    <p className="text-xs text-base-content/70">Auction ID: {order.auction_id}</p>
                    <p className="text-xs text-base-content/70 capitalize">Condition: {product.condition}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Buyer & Seller */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card card-compact bg-base-200/50 shadow-sm">
              <div className="card-body">
                <h4 className="card-title text-base flex items-center gap-2"><FiUser /> Buyer</h4>
                <p className="text-sm">{order.buyer?.username || 'N/A'}</p>
                <p className="text-xs text-base-content/70">{order.buyer?.email || 'No email'}</p>
              </div>
            </div>
            <div className="card card-compact bg-base-200/50 shadow-sm">
              <div className="card-body">
                <h4 className="card-title text-base flex items-center gap-2"><FiUser /> Seller</h4>
                <p className="text-sm">{order.seller?.username || 'N/A'}</p>
                <p className="text-xs text-base-content/70">{order.seller?.email || 'No email'}</p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
           <div className="card card-compact bg-base-200/50 shadow-sm">
                <div className="card-body">
                    <div className="flex justify-between items-center">
                        <h4 className="card-title text-base flex items-center gap-2"><FiMapPin /> Shipping Address</h4>
                        {order.status === 'pending' || order.status === 'paid' ? ( // Only allow edit for certain statuses
                             <button onClick={() => setIsEditingShipping(!isEditingShipping)} className="btn btn-xs btn-ghost">
                                {isEditingShipping ? 'Cancel' : <><FiEdit size={12} className="mr-1"/> Edit</>}
                            </button>
                        ) : null}
                    </div>
                    {!isEditingShipping ? (
                        order.shipping_address ? (
                            <>
                                <p className="text-sm">{order.shipping_address.line1}</p>
                                {order.shipping_address.line2 && <p className="text-sm">{order.shipping_address.line2}</p>}
                                <p className="text-sm">{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                                <p className="text-sm">{order.shipping_address.country}</p>
                            </>
                        ) : (
                            <p className="text-sm italic text-base-content/60">No shipping address provided.</p>
                        )
                    ) : (
                        <div className="space-y-2 mt-2">
                            <input type="text" name="line1" placeholder="Address Line 1" value={shippingAddress.line1} onChange={handleShippingChange} className="input input-sm input-bordered w-full" />
                            <input type="text" name="city" placeholder="City" value={shippingAddress.city} onChange={handleShippingChange} className="input input-sm input-bordered w-full" />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" name="state" placeholder="State/Province" value={shippingAddress.state} onChange={handleShippingChange} className="input input-sm input-bordered w-full" />
                                <input type="text" name="postal_code" placeholder="Postal Code" value={shippingAddress.postal_code} onChange={handleShippingChange} className="input input-sm input-bordered w-full" />
                            </div>
                            <input type="text" name="country" placeholder="Country (e.g., US)" value={shippingAddress.country} onChange={handleShippingChange} className="input input-sm input-bordered w-full" />
                            <button onClick={handleSaveShipping} className="btn btn-xs btn-primary mt-1">Save Address</button>
                        </div>
                    )}
                </div>
            </div>


          {/* Financials & Status */}
          <div className="card card-compact bg-base-200/50 shadow-sm">
            <div className="card-body">
              <h4 className="card-title text-base flex items-center gap-2"><FiDollarSign />Financials & Status</h4>
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <tbody>
                    <tr><td className="font-medium text-base-content/80">Subtotal:</td><td className="text-right">${parseFloat(order.total_amount - (order.shipping_cost || 0) - (order.tax_amount || 0)).toFixed(2)}</td></tr>
                    <tr><td className="font-medium text-base-content/80">Shipping:</td><td className="text-right">${parseFloat(order.shipping_cost || 0).toFixed(2)}</td></tr>
                    <tr><td className="font-medium text-base-content/80">Tax:</td><td className="text-right">${parseFloat(order.tax_amount || 0).toFixed(2)}</td></tr>
                    <tr className="font-bold text-base"><td className="text-base-content">Total:</td><td className="text-right">${parseFloat(order.total_amount).toFixed(2)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="divider my-2"></div>
              <p className="text-sm">Date Placed: <span className="font-medium">{format(new Date(order.created_at), 'PPpp')}</span></p>
              <p className="text-sm">Current Status: <span className={`badge badge-md font-semibold capitalize ${order.status === 'paid' ? 'badge-success' : order.status === 'pending' ? 'badge-warning' : 'badge-info'}`}>{order.status}</span></p>
              {order.payment_intent_id && <p className="text-xs text-base-content/70">Payment ID: {order.payment_intent_id}</p>}
            </div>
          </div>
        </div>

        <div className="modal-action mt-6">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
};

export default OrderDetailsModal;