import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUsers, FiMessageSquare } from 'react-icons/fi';

const ChatMessage = ({ msg }) => (
  <div className={`flex items-start gap-2.5 py-1.5 px-1 ${msg.highlight ? 'bg-yellow-500/10 rounded-md -mx-1 px-2 py-1' : ''}`}>
    <div className="avatar placeholder shrink-0">
      <div className={`w-7 h-7 rounded-full ${msg.user.isMod ? 'ring ring-blue-500 ring-offset-base-100 ring-offset-1' : 'bg-neutral-700'}`}>
        {msg.user.avatar ? <img src={msg.user.avatar} alt={msg.user.username} /> : <span className="text-xs text-neutral-300">{msg.user.username.substring(0,2).toUpperCase()}</span>}
      </div>
    </div>
    <div>
      <span className={`text-xs font-semibold ${msg.user.isMod ? 'text-blue-400' : 'text-neutral-400'}`}>
        {msg.user.username} {msg.user.isMod && <span className="badge badge-xs badge-outline border-blue-500 text-blue-500 ml-1">Mod</span>}
      </span>
      <p className="text-sm text-white leading-snug break-words">{msg.text}</p>
    </div>
  </div>
);

const WatcherItem = ({ watcher }) => ( /* Placeholder */
    <div className="flex items-center gap-2 p-2 hover:bg-neutral-800/50 rounded">
         <div className="avatar placeholder shrink-0">
            <div className="w-7 h-7 rounded-full bg-neutral-700">
                <span className="text-xs text-neutral-300">{watcher.username.substring(0,2).toUpperCase()}</span>
            </div>
        </div>
        <span className="text-sm text-neutral-300">{watcher.username}</span>
    </div>
);

const StreamChat = ({ messages, activeTab, onTabChange, viewerCount }) => {
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Scroll on new messages

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      console.log("Sending message:", newMessage);
      // TODO: Implement actual message sending via WebSocket
      setNewMessage('');
    }
  };

  // Placeholder watchers
  const watchers = Array.from({length: Math.min(viewerCount, 20)}, (_, i) => ({id: `w${i}`, username: `Watcher${i+1}`}));

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Tabs: Chat / Watching */}
      <div className="flex border-b border-neutral-800 shrink-0">
        <button
          onClick={() => onTabChange('chat')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors
                      ${activeTab === 'chat' || activeTab === 'chat-visible-mobile' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
        >
          <FiMessageSquare size={14}/> Chat
        </button>
        <button
          onClick={() => onTabChange('watching')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors
                      ${activeTab === 'watching' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
        >
          <FiUsers size={14}/> Watching ({viewerCount})
        </button>
      </div>

      {/* Message List / Watcher List */}
      <div className="flex-grow overflow-y-auto p-2 sm:p-3 space-y-1">
        {(activeTab === 'chat' || activeTab === 'chat-visible-mobile') && messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}
        {activeTab === 'watching' && watchers.map(w => <WatcherItem key={w.id} watcher={w} />)}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area (only for chat tab) */}
      {(activeTab === 'chat' || activeTab === 'chat-visible-mobile') && (
        <form onSubmit={handleSendMessage} className="p-2 sm:p-3 border-t border-neutral-800 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              className="input input-sm w-full bg-neutral-800 border-neutral-700 rounded-lg pr-10 focus:border-blue-500 placeholder-neutral-500"
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