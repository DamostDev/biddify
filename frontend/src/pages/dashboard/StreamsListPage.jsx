// frontend/src/pages/dashboard/StreamsListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import streamService from '../../services/streamService';
import StreamTable from '../../components/streams/StreamTable'; // Path to your StreamTable
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal';
import { FiPlus, FiTv, FiAlertCircle, FiInbox, FiVideo } from 'react-icons/fi';

const StreamsListPage = () => {
  const [streams, setStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamToDelete, setStreamToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  const fetchStreams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await streamService.getMyStreams(); // Fetches streams for the logged-in user
      setStreams(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load your streams.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  const handleEditStream = (streamId) => {
    navigate(`/dashboard/streams/edit/${streamId}`);
  };

  const handleOpenDeleteModal = (stream) => {
    if (stream.status === 'live') {
        alert("Cannot delete a stream that is currently live. Please end the stream first.");
        return;
    }
    setStreamToDelete(stream);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setStreamToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!streamToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await streamService.deleteStream(streamToDelete.stream_id);
      fetchStreams(); // Refresh list
      handleCloseDeleteModal();
    } catch (err) {
      setError(err.message || 'Failed to delete stream.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGoLive = (streamId) => {
    // This would typically navigate to the actual stream page where LiveKit connection happens
    // Or could trigger a backend 'start stream' if that's a separate step from 'goLiveStreamer' (LiveKit token fetch)
    navigate(`/stream/${streamId}`); // Example: navigate to the public stream page
    // Or you might have a dedicated "Host Stream" page: navigate(`/dashboard/stream/${streamId}/host`);
    console.log(`Attempting to go live with stream ID: ${streamId}`);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-1 pb-4 border-b border-base-300">
        <h1 className="text-2xl font-semibold text-base-content flex items-center gap-2">
          <FiTv /> My Streams
        </h1>
        <Link to="/dashboard/streams/create" className="btn btn-primary btn-sm md:btn-md normal-case w-full sm:w-auto">
          <FiPlus className="mr-1 hidden sm:inline" /> Schedule New Stream
        </Link>
      </div>

      {error && (
        <div role="alert" className="alert alert-error my-4 shadow-md">
          <FiAlertCircle className="w-6 h-6" />
          <span>{error}</span>
        </div>
      )}

      {(!isLoading && streams.length === 0 && !error) ? (
        <div className="text-center py-16 px-6 bg-base-100 rounded-lg shadow-sm mt-6 border border-base-300/30">
            <FiInbox size={48} className="text-base-content/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-base-content mb-2">No Streams Scheduled Yet</h3>
            <p className="text-base-content/70 mb-4">Get started by scheduling your first live stream event!</p>
            <Link to="/dashboard/streams/create" className="btn btn-primary btn-sm">
                Schedule Your First Stream
            </Link>
        </div>
      ) : (
        <StreamTable
          streams={streams}
          onEdit={handleEditStream}
          onDelete={handleOpenDeleteModal}
          onGoLive={handleGoLive}
          isLoading={isLoading}
        />
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        itemName={streamToDelete?.title || 'this stream'}
        itemType="stream"
        isProcessing={isDeleting}
      />
    </div>
  );
};

export default StreamsListPage;