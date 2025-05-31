// frontend/src/pages/ForYouPage.jsx
import React, { useState, useEffect } from 'react';
import streamService from '../services/streamService';
import StreamCard, { StreamCardSkeleton } from '../components/home/StreamCard'; // Adjust path if needed
import HomeSidebar from '../components/home/HomeSidebar'; // Optional: if you want sidebar here

const transformStreamData = (stream) => ({ /* ... same transform function as HomePage ... */
    id: stream.stream_id,
    user: { username: stream.User?.username || 'N/A', avatarUrl: stream.User?.profile_picture_url },
    title: stream.title,
    category: stream.Category?.name || 'General',
    viewerCount: stream.viewer_count,
    startTime: stream.status === 'scheduled' ? new Date(stream.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
    isLive: stream.status === 'live',
    thumbnailUrl: stream.thumbnail_url || `https://picsum.photos/seed/${stream.stream_id}/${stream.status === 'scheduled' ? '320/400' : '300/375'}`,
    tags: stream.tags || [],
});

const ForYouPage = () => {
  const [streams, setStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStreams = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await streamService.getAllStreams({ status: 'live' }); // Or your specific "for you" logic
        setStreams((data || []).map(transformStreamData));
      } catch (err) {
        setError(err.message || 'Failed to load streams.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStreams();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row bg-white min-h-screen">
      <HomeSidebar /> {/* Optional */}
      <main className="flex-1 overflow-y-auto bg-white py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <h1 className="text-3xl font-bold mb-8 text-neutral-800">Streams For You</h1>
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array(8).fill(null).map((_, index) => <StreamCardSkeleton key={`skel-${index}`} />)}
          </div>
        )}
        {error && <p className="text-red-500">{error}</p>}
        {!isLoading && !error && streams.length === 0 && (
          <p className="text-neutral-600">No live streams available right now. Check back soon!</p>
        )}
        {!isLoading && !error && streams.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {streams.map(stream => (
              <StreamCard key={stream.id} stream={stream} type="live" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ForYouPage;