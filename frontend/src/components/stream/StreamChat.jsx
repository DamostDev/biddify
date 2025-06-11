// frontend/src/components/stream/StreamChat.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiSend, FiUsers, FiMessageSquare, FiSmile, FiArrowDownCircle } from 'react-icons/fi';
import EmotionTracker from './EmotionTracker';

const ChatMessage = ({ msg, localParticipantIdentity, variant }) => {
  const isOverlay = variant === 'overlay';
  const isOwnMessage = msg.user && msg.user.identity === localParticipantIdentity;

  if (isOverlay) {
    return (
      <div className={`flex items-start gap-2.5 mb-2 px-3 py-1 rounded-full text-shadow-sm ${isOwnMessage ? 'justify-end' : ''}`}>
          <div className="max-w-[85%] text-sm leading-snug break-words p-2 rounded-xl shadow-md bg-black/60 text-white backdrop-blur-sm">
            {!isOwnMessage && (
              <span className="font-semibold text-yellow-300 mr-1.5">{msg.user.username}:</span>
            )}
            {msg.text}
          </div>
      </div>
    );
  }

  // --- Desktop Variant Logic ---
  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
    } catch (e) { return ''; }
  };

  if (!msg.user) return null;

  if (isOwnMessage) {
    return (
      <div className="flex justify-end mb-1.5">
        <div className="flex flex-col items-end max-w-[75%] sm:max-w-[65%]">
          <div className="bg-blue-600 text-white py-2 px-3 rounded-t-xl rounded-bl-xl shadow">
            <p className="text-sm leading-snug break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              {msg.text}
            </p>
          </div>
          <p className="text-[10px] text-blue-200 mt-0.5 px-1">
            {formatTimestamp(msg.timestamp)}
          </p>
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex items-start gap-2.5 mb-2">
        <div className="avatar placeholder shrink-0 mt-1">
          <div className={`w-7 h-7 rounded-full ${msg.user.isMod ? 'ring-2 ring-yellow-400' : 'bg-neutral-800'}`}>
            {msg.user.avatar ? (
              <img src={msg.user.avatar} alt={msg.user.username} className="object-cover w-full h-full"/>
            ) : (
              <span className="text-xs text-neutral-300 font-semibold">{msg.user.username?.substring(0,2).toUpperCase()}</span>
            )}
          </div>
        </div>
        <div className="bg-neutral-700 text-white py-2 px-3 rounded-xl shadow max-w-[75%] sm:max-w-[65%]">
          <p className="text-sm leading-snug break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            <span className={`font-semibold ${msg.user.isMod ? 'text-sky-400' : 'text-yellow-400'}`}>
              {msg.user.username}:
            </span>
            {' '}
            <span className="text-white">{msg.text}</span>
          </p>
          <p className="text-[10px] text-neutral-400 text-right mt-1 leading-none">
            {formatTimestamp(msg.timestamp)}
          </p>
        </div>
      </div>
    );
  }
};

const WatcherItem = ({ watcher }) => (
    <div className="flex items-center gap-2 p-2 hover:bg-neutral-800/50 rounded">
         <div className="avatar placeholder shrink-0">
            <div className={`w-7 h-7 rounded-full ${watcher.isStreamer ? 'ring-2 ring-purple-400' : 'bg-neutral-700'}`}>
                <span className="text-xs text-neutral-300">{watcher.username?.substring(0,2).toUpperCase()}</span>
            </div>
        </div>
        <span className={`text-sm ${watcher.isStreamer ? 'text-purple-300 font-semibold' : 'text-neutral-300'}`}>{watcher.username}</span>
    </div>
);

const StreamChat = ({ 
    variant = 'full',
    messages = [], 
    activeTab, 
    onTabChange, 
    viewerCount, 
    onSendMessage, 
    localParticipantIdentity, 
    roomParticipantsForChat = [] 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  if (variant === 'overlay') {
    return (
      <div className="h-full max-h-[50vh] w-full overflow-y-auto chat-fade-mask px-2 pb-2 pointer-events-auto">
        {messages.map(msg => (
            <ChatMessage key={msg.id} msg={msg} localParticipantIdentity={localParticipantIdentity} variant="overlay" />
        ))}
        <div ref={chatEndRef} />
      </div>
    );
  }

  if (variant === 'input_only') {
      return (
        <form onSubmit={handleFormSubmit} className="p-3 bg-gradient-to-t from-black/50 to-transparent">
          <div className="relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              className="input input-sm w-full bg-black/60 border-neutral-700/50 rounded-full pr-10 focus:border-blue-500 placeholder-neutral-400 text-white backdrop-blur-sm"
            />
            <button type="submit" className="absolute top-1/2 right-1 -translate-y-1/2 btn btn-ghost btn-xs btn-circle text-blue-400 hover:bg-blue-500/20" aria-label="Send message">
              <FiSend size={16} />
            </button>
          </div>
        </form>
      );
  }

  const watchers = roomParticipantsForChat.map(p => ({
    id: p.sid,
    username: p.name || p.identity,
    isStreamer: p.metadata?.role === 'streamer' 
  }));
  
  return (
    <div className="flex flex-col h-full bg-black text-white">
      <div className="flex border-b border-neutral-800 shrink-0">
        <button onClick={() => onTabChange('chat')} className={`flex-1 py-2.5 text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'chat' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}>
          <FiMessageSquare size={14}/> Chat
        </button>
        <button onClick={() => onTabChange('watching')} className={`flex-1 py-2.5 text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'watching' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}>
          <FiUsers size={14}/> Watching ({viewerCount})
        </button>
        <button onClick={() => onTabChange('emotion')} className={`flex-1 py-2.5 text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'emotion' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}>
          <FiSmile size={14}/> Emotion
        </button>
      </div>

      <div className="relative flex-grow overflow-y-auto">
        <div className="p-2 sm:p-3 space-y-0">
          {activeTab === 'chat' && messages.map(msg => (
            <ChatMessage key={msg.id} msg={msg} localParticipantIdentity={localParticipantIdentity} variant="full" />
          ))}
          {activeTab === 'watching' && watchers.map(w => <WatcherItem key={w.id} watcher={w} />)}
          {activeTab === 'emotion' && <EmotionTracker />}
          <div ref={chatEndRef} />
        </div>
      </div>

      {activeTab === 'chat' && (
        <form onSubmit={handleFormSubmit} className="p-2 sm:p-3 border-t border-neutral-800 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              className="input input-sm w-full bg-neutral-800 border-neutral-700 rounded-lg pr-10 focus:border-blue-500 placeholder-neutral-500 text-white"
            />
            <button type="submit" className="absolute top-1/2 right-1 -translate-y-1/2 btn btn-ghost btn-xs btn-circle text-blue-400 hover:bg-blue-500/20" aria-label="Send message">
              <FiSend size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default StreamChat;