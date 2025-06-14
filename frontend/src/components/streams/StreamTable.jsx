// frontend/src/components/streams/StreamTable.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiEdit, FiTrash2, FiPlayCircle, FiCalendar, FiEye, FiEyeOff, FiCopy, FiVideo } from 'react-icons/fi';
import { format } from 'date-fns'; // For formatting dates

const StreamTable = ({ streams, onEdit, onDelete, onGoLive, isLoading }) => {

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Stream Key Copied!");
    }).catch(err => {
      console.error('Failed to copy stream key: ', err);
      alert("Failed to copy key.");
    });
  };


  if (isLoading && (!streams || streams.length === 0)) {
    return (
      <div className="overflow-x-auto bg-base-100 rounded-lg shadow-sm">
        <table className="table w-full">
          <thead>
            <tr className="text-xs uppercase text-base-content/70">
              <th className="p-3">Title</th>
              <th className="p-3 hidden md:table-cell">Status</th>
              <th className="p-3 hidden lg:table-cell">Category</th>
              <th className="p-3 hidden sm:table-cell">Start Time</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, index) => (
              <tr key={`skel-stream-${index}`} className="animate-pulse">
                <td className="p-3"><div className="h-4 w-40 bg-base-300 rounded"></div></td>
                <td className="p-3 hidden md:table-cell"><div className="h-5 w-16 bg-base-300 rounded-full"></div></td>
                <td className="p-3 hidden lg:table-cell"><div className="h-4 w-24 bg-base-300 rounded"></div></td>
                <td className="p-3 hidden sm:table-cell"><div className="h-4 w-32 bg-base-300 rounded"></div></td>
                <td className="p-3 text-center"><div className="h-6 w-20 bg-base-300 rounded"></div></td>
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
            <th className="p-3">Title & Visibility</th>
            <th className="p-3 hidden md:table-cell text-center">Status</th>
            <th className="p-3 hidden lg:table-cell">Category</th>
            <th className="p-3 hidden sm:table-cell">Scheduled Start</th>
            <th className="p-3 text-center">Stream Key</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {streams.map((stream) => (
            <tr key={stream.stream_id} className="hover:bg-primary/5 transition-colors">
              <td className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="avatar hidden sm:flex shrink-0 placeholder">
                    <div className="bg-neutral-focus text-neutral-content mask mask-squircle w-10 h-10">
                      {stream.thumbnail_url ? (
                        <img src={stream.thumbnail_url} alt={stream.title} className="object-cover" />
                      ) : (
                        <span className="text-xl"><FiVideo/></span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <button
                      onClick={() => onEdit(stream.stream_id)}
                      className="font-semibold text-sm text-base-content hover:text-primary transition-colors text-left hover:underline truncate block"
                      title={stream.title}
                    >
                      {stream.title}
                    </button>
                     <div className="text-xs text-base-content/70 mt-0.5 flex items-center gap-1">
                        {stream.is_private ? <FiEyeOff size={12} className="text-warning"/> : <FiEye size={12} className="text-success"/>}
                        <span>{stream.is_private ? 'Private' : 'Public'}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="p-3 hidden md:table-cell text-center">
                <span className={`badge badge-sm font-medium capitalize
                  ${stream.status === 'live' ? 'badge-error animate-pulse' : ''}
                  ${stream.status === 'scheduled' ? 'badge-info' : ''}
                  ${stream.status === 'ended' ? 'badge-ghost' : ''}
                  ${stream.status === 'cancelled' ? 'badge-warning badge-outline' : ''}
                `}>
                  {stream.status}
                </span>
              </td>
              <td className="p-3 hidden lg:table-cell text-sm text-base-content/80">
                {stream.Category?.name || <span className="opacity-50">-</span>}
              </td>
              <td className="p-3 hidden sm:table-cell text-sm text-base-content/80">
                {stream.start_time ? format(new Date(stream.start_time), 'MMM d, yyyy HH:mm') : <span className="opacity-50">Not set</span>}
              </td>
              <td className="p-3 text-center">
                {stream.stream_key ? (
                  <button
                    onClick={() => copyToClipboard(stream.stream_key)}
                    className="btn btn-xs btn-ghost text-xs"
                    title="Copy Stream Key"
                  >
                    <FiCopy size={12} className="mr-1"/> Copy Key
                  </button>
                ) : (
                  <span className="text-xs opacity-50">-</span>
                )}
              </td>
              <td className="p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  {stream.status === 'scheduled' && onGoLive && (
                    <button
                      onClick={() => onGoLive(stream.stream_id)}
                      className="btn btn-xs btn-success btn-outline normal-case"
                      title="Start this stream now"
                    >
                      <FiPlayCircle size={12} className="mr-1"/> Go Live
                    </button>
                  )}
                   <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-xs m-1 normal-case">More ▼</label>
                    <ul tabIndex={0} className="dropdown-content z-[10] menu menu-xs p-1 shadow bg-base-100 rounded-box w-28 border border-base-300">
                      <li>
                        <button onClick={() => onEdit(stream.stream_id)} className="flex items-center w-full text-left hover:bg-base-200 p-1.5 rounded">
                          <FiEdit className="inline mr-1.5"/> Edit
                        </button>
                      </li>
                      {stream.status !== 'live' && ( // Cannot delete a live stream
                        <li>
                          <button onClick={() => onDelete(stream)} className="flex items-center w-full text-left hover:bg-error/10 text-error p-1.5 rounded">
                            <FiTrash2 className="inline mr-1.5"/> Delete
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StreamTable;