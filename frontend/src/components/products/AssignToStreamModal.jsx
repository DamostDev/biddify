import React, { useState, useEffect } from 'react';
import streamService from '../../services/streamService'; // To fetch user's streams
import { assignProductsToStream } from '../../services/productService'; // To assign products
import { FiX, FiCheckCircle, FiAlertCircle, FiTv } from 'react-icons/fi';

const AssignToStreamModal = ({ isOpen, onClose, selectedProductIds, onAssignSuccess }) => {
  const [streams, setStreams] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingStreams(true);
      setError(null);
      setSuccessMessage(null);
      setSelectedStreamId(''); // Reset selection
      streamService.getMyStreams()
        .then(data => {
          const assignableStreams = (data || []).filter(s => ['scheduled', 'live'].includes(s.status));
          setStreams(assignableStreams);
          if (assignableStreams.length === 0 && !error) { // Set error if no assignable streams after loading
            setError('You have no scheduled or live streams available to assign products to.');
          }
        })
        .catch(err => {
          setError('Failed to load your streams. ' + (err.message || 'Please try again.'));
          setStreams([]);
        })
        .finally(() => setIsLoadingStreams(false));
    }
  }, [isOpen]); // Removed `error` from dependency array to avoid loop if error is set inside

  const handleAssign = async () => {
    if (!selectedStreamId) {
      setError('Please select a stream.');
      return;
    }
    if (!selectedProductIds || selectedProductIds.length === 0) {
      setError('No products selected to assign.');
      return;
    }

    setIsAssigning(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await assignProductsToStream(selectedProductIds, selectedStreamId);
      setSuccessMessage(response.message || 'Products assigned successfully!');
      if (onAssignSuccess) {
        onAssignSuccess({ streamId: selectedStreamId, productIds: selectedProductIds });
      }
      setTimeout(() => {
        handleClose();
      }, 2000); // Give time to read success message
    } catch (err) {
      setError(err.message || 'Failed to assign products. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    // Reset local state if needed, though useEffect on isOpen also handles this
    // setSuccessMessage(null);
    // setError(null);
    // setSelectedStreamId('');
    onClose();
  };

  if (!isOpen) return null;

  const numSelected = selectedProductIds.length;

  return (
    <dialog id="assign_to_stream_modal" className="modal modal-open modal-bottom sm:modal-middle">
      <div className="modal-box w-11/12 max-w-lg bg-base-100 shadow-xl rounded-lg">
        <button onClick={handleClose} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-base-content/70 hover:bg-base-300/70" disabled={isAssigning}>✕</button>
        <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
            <FiTv className="text-primary"/> Assign Product(s) to Stream
        </h3>
        <p className="text-sm text-base-content/80 mb-5">
          Assign <span className="font-semibold text-primary">{numSelected}</span> selected product{numSelected === 1 ? '' : 's'} to one of your streams.
        </p>

        {isLoadingStreams && (
          <div className="flex flex-col justify-center items-center h-32 my-4">
            <span className="loading loading-lg loading-spinner text-primary"></span>
            <span className="mt-3 text-base-content/70">Loading your streams...</span>
          </div>
        )}

        {!isLoadingStreams && streams.length > 0 && (
          <div className="form-control w-full mb-4">
            <label className="label pt-0">
              <span className="label-text font-medium text-base">Select a Stream*</span>
            </label>
            <select
              className="select select-bordered w-full focus:select-primary"
              value={selectedStreamId}
              onChange={(e) => {setSelectedStreamId(e.target.value); setError(null);}}
              disabled={isAssigning}
            >
              <option value="" disabled>Choose from your scheduled/live streams</option>
              {streams.map(stream => (
                <option key={stream.stream_id} value={stream.stream_id}>
                  {stream.title} ({stream.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {!isLoadingStreams && streams.length === 0 && !error && ( // This state will be overridden by the useEffect error if it was an API fail
           <div className="alert alert-info my-4 text-sm shadow-md">
              <FiAlertCircle />
             <span>You don't have any 'Scheduled' or 'Live' streams available to assign products to. Please create or schedule a stream first.</span>
           </div>
        )}


        {error && (
          <div role="alert" className="alert alert-error text-sm my-4 shadow-md">
            <FiAlertCircle className="shrink-0"/>
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div role="alert" className="alert alert-success text-sm my-4 shadow-md">
            <FiCheckCircle className="shrink-0"/>
            <span>{successMessage}</span>
          </div>
        )}

        <div className="modal-action mt-6">
          <button className="btn btn-ghost" onClick={handleClose} disabled={isAssigning}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={isAssigning || isLoadingStreams || !selectedStreamId || streams.length === 0 || numSelected === 0}
          >
            {isAssigning ? <span className="loading loading-spinner loading-sm"></span> : `Assign ${numSelected} Product${numSelected === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
      {/* Click outside to close */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
};

export default AssignToStreamModal;