import React, { useState, useEffect } from 'react';
import { FiX, FiAlertCircle, FiCheckCircle, FiSave } from 'react-icons/fi';
import orderService from '../../services/orderService';

const UpdateOrderStatusModal = ({ isOpen, onClose, order, onStatusUpdateSuccess }) => {
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (order) {
      setNewStatus(order.status); // Initialize with current status
    }
    setError(null);
    setSuccess(null);
  }, [order, isOpen]);

  const handleUpdate = async () => {
    if (!order || !newStatus || newStatus === order.status) {
      setError("Please select a new status.");
      return;
    }
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const updatedOrder = await orderService.updateOrderStatus(order.order_id, newStatus);
      setSuccess(`Order #${order.order_id} status updated to ${newStatus}.`);
      if (onStatusUpdateSuccess) {
        onStatusUpdateSuccess(updatedOrder);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update status.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !order) return null;

  // Define available statuses based on current status and role (simplified for seller)
  let availableStatuses = [];
  if (order.status === 'pending') availableStatuses = ['paid', 'cancelled'];
  else if (order.status === 'paid') availableStatuses = ['shipped', 'cancelled', 'refunded'];
  else if (order.status === 'shipped') availableStatuses = ['delivered']; // Buyer action, but good to show

  return (
    <dialog id="update_order_status_modal" className="modal modal-open modal-bottom sm:modal-middle">
      <div className="modal-box">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" disabled={isUpdating}>✕</button>
        <h3 className="font-bold text-lg">Update Order Status</h3>
        <p className="py-2 text-sm">Order ID: <span className="font-mono">#{order.order_id}</span></p>
        <p className="text-sm mb-1">Current Status: <span className={`badge badge-sm font-medium capitalize ${order.status === 'paid' ? 'badge-success' : order.status === 'pending' ? 'badge-warning' : 'badge-info'}`}>{order.status}</span></p>

        <div className="form-control w-full">
          <label className="label"><span className="label-text">New Status:</span></label>
          <select
            className="select select-bordered"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={isUpdating || availableStatuses.length === 0}
          >
            <option value={order.status} disabled>Select new status</option>
            {availableStatuses.map(statusOption => (
              <option key={statusOption} value={statusOption} className="capitalize">
                {statusOption}
              </option>
            ))}
          </select>
          {availableStatuses.length === 0 && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'refunded' && (
            <p className="text-xs text-warning mt-1">No further status updates available for this order's current state from your role.</p>
          )}
        </div>

        {error && <div role="alert" className="alert alert-error text-xs p-2 mt-4"><FiAlertCircle /><span >{error}</span></div>}
        {success && <div role="alert" className="alert alert-success text-xs p-2 mt-4"><FiCheckCircle /><span >{success}</span></div>}

        <div className="modal-action mt-6">
          <button className="btn btn-ghost" onClick={onClose} disabled={isUpdating}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleUpdate}
            disabled={isUpdating || newStatus === order.status || availableStatuses.length === 0}
          >
            {isUpdating ? <span className="loading loading-spinner loading-sm"></span> : <><FiSave className="mr-2"/>Update Status</>}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
};

export default UpdateOrderStatusModal;