import React from 'react';
import { format } from 'date-fns';
import { FiEye, FiTruck, FiPackage, FiUser, FiMoreVertical } from 'react-icons/fi';

const OrderTable = ({ orders, isLoading, onUpdateStatusClick, onViewDetails, userRolePerspective = 'seller' }) => {

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid': return 'badge-success';
      case 'shipped': return 'badge-info';
      case 'delivered': return 'badge-accent';
      case 'pending': return 'badge-warning';
      case 'cancelled':
      case 'refunded': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  if (isLoading && (!orders || orders.length === 0)) {
    return (
      <div className="overflow-x-auto bg-base-100 rounded-lg shadow-sm">
        <table className="table w-full">
          <thead>
            <tr className="text-xs uppercase text-base-content/70">
              <th className="p-3">Order ID</th>
              <th className="p-3">Product</th>
              <th className="p-3 hidden sm:table-cell">{userRolePerspective === 'seller' ? 'Buyer' : 'Seller'}</th>
              <th className="p-3 hidden md:table-cell">Date</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <tr key={`skel-order-${index}`} className="animate-pulse">
                <td className="p-3"><div className="h-4 w-20 bg-base-300 rounded"></div></td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-base-300 rounded-md shrink-0"></div>
                    <div className="h-4 w-32 bg-base-300 rounded"></div>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell"><div className="h-4 w-24 bg-base-300 rounded"></div></td>
                <td className="p-3 hidden md:table-cell"><div className="h-4 w-28 bg-base-300 rounded"></div></td>
                <td className="p-3 text-right"><div className="h-4 w-12 bg-base-300 rounded ml-auto"></div></td>
                <td className="p-3 text-center"><div className="h-5 w-20 bg-base-300 rounded-full mx-auto"></div></td>
                <td className="p-3 text-center"><div className="h-6 w-16 bg-base-300 rounded mx-auto"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-base-100 rounded-lg shadow-sm border border-base-300/50">
      <table className="table w-full table-zebra-zebra">
        <thead className="bg-base-200/50">
          <tr className="text-xs uppercase text-base-content/70">
            <th className="p-3">Order ID</th>
            <th className="p-3">Product</th>
            <th className="p-3 hidden sm:table-cell">{userRolePerspective === 'seller' ? 'Buyer' : 'Seller'}</th>
            <th className="p-3 hidden md:table-cell">Date Placed</th>
            <th className="p-3 text-right">Total</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const product = order.Auction?.Product;
            const primaryImage = product?.images?.find(img => img.is_primary) || product?.images?.[0];
            const otherParty = userRolePerspective === 'seller' ? order.buyer : order.seller;

            return (
              <tr key={order.order_id} className="hover:bg-primary/5 transition-colors">
                <td className="p-3">
                  <button
                    onClick={() => onViewDetails(order)} // Pass full order object
                    className="text-xs font-mono hover:underline text-primary"
                    title="View Order Details"
                  >
                    #{order.order_id}
                  </button>
                </td>
                <td className="p-3">
                  {product ? (
                    <div className="flex items-center space-x-3">
                      <div className="avatar shrink-0">
                        <div className="mask mask-squircle w-10 h-10 bg-base-300">
                          {primaryImage?.image_url ? (
                            <img src={primaryImage.image_url} alt={product.title} className="object-cover"/>
                          ) : (
                            <FiPackage className="w-6 h-6 text-base-content/40 m-auto" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-base-content truncate" title={product.title}>
                          {product.title}
                        </div>
                        <div className="text-xs text-base-content/70">
                          Auction ID: {order.auction_id || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-base-content/60 italic">Product info unavailable</span>
                  )}
                </td>
                <td className="p-3 hidden sm:table-cell">
                  {otherParty ? (
                     <div className="flex items-center space-x-2">
                        <div className="avatar placeholder shrink-0">
                            <div className={`bg-neutral-focus text-neutral-content rounded-full w-8 h-8 text-xs flex items-center justify-center`}>
                            {otherParty.profile_picture_url ? <img src={otherParty.profile_picture_url} alt={otherParty.username}/> : <span>{otherParty.username?.charAt(0).toUpperCase() || '?'}</span>}
                            </div>
                        </div>
                        <span className="text-sm text-base-content/90 truncate" title={otherParty.username}>{otherParty.username}</span>
                    </div>
                  ) : (
                    <span className="text-xs opacity-50">-</span>
                  )}
                </td>
                <td className="p-3 hidden md:table-cell text-sm text-base-content/80">
                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                </td>
                <td className="p-3 text-right font-semibold text-base-content">
                  ${parseFloat(order.total_amount).toFixed(2)}
                </td>
                <td className="p-3 text-center">
                  <span className={`badge badge-sm font-medium capitalize ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-xs m-1">
                        <FiMoreVertical size={16}/>
                    </label>
                    <ul tabIndex={0} className="dropdown-content z-[10] menu menu-xs p-1 shadow bg-base-100 rounded-box w-40 border border-base-300">
                      <li>
                        <button onClick={() => onViewDetails(order)} className="flex items-center w-full text-left hover:bg-base-200 p-1.5 rounded">
                          <FiEye className="mr-1.5" /> View Details
                        </button>
                      </li>
                      {userRolePerspective === 'seller' && ['paid', 'pending'].includes(order.status) && (
                        <li>
                          <button onClick={() => onUpdateStatusClick(order)} className="flex items-center w-full text-left hover:bg-base-200 p-1.5 rounded">
                            <FiTruck className="mr-1.5" /> Update Status
                          </button>
                        </li>
                      )}
                      {userRolePerspective === 'buyer' && order.status === 'shipped' && (
                        <li>
                          <button onClick={() => onUpdateStatusClick(order)} className="flex items-center w-full text-left hover:bg-base-200 p-1.5 rounded">
                            <FiPackage className="mr-1.5" /> Mark as Delivered
                          </button>
                        </li>
                      )}
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

export default OrderTable;