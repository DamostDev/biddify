import React from 'react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName = 'item', isLoading }) => {
  if (!isOpen) return null;

  return (
    <dialog id="delete_modal" className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-error">Confirm Deletion</h3>
        <p className="py-4">Are you sure you want to delete this {itemName}? This action cannot be undone.</p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button className="btn btn-error" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <span className="loading loading-spinner loading-sm"></span> : 'Delete'}
          </button>
        </div>
      </div>
      {/* Optional: Click outside closes modal */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};

export default DeleteConfirmationModal;