// frontend/src/components/stream/StreamChat.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react'; // Added useCallback
import { FiSend, FiUsers, FiMessageSquare, FiArrowDownCircle } from 'react-icons/fi'; // Added FiArrowDownCircle

// Assuming ChatMessage and WatcherItem are defined above this or imported
// For clarity, I'll include a minimal ChatMessage that can render system messages if they are passed
const ChatMessage = ({ msg, localParticipantIdentity }) => {
  const isOwnMessage = msg.user && msg.user.identity === localParticipantIdentity; // Check if msg.user exists

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
    } catch (e) { return ''; }
  };

  if (msg.type === 'system') {
    return (
      <div className="text-center py-2 my-1">
        <p className="text-xs text-neutral-500 italic px-2 py-1 bg-neutral-800/50 rounded-full inline-block">
          {msg.text}
        </p>
      </div>
    );
  }

  if (!msg.user) { // Fallback for messages without a user object (should not happen with current setup)
      return (
          <div className="text-xs text-neutral-500 p-1">Invalid message data.</div>
      );
  }

  // Your existing styling for user messages (own and others)
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
          <div className={`w-7 h-7 rounded-full ${msg.user.isMod ? 'ring-2 ring-yellow-400 ring-offset-black ring-offset-1' : 'bg-neutral-800'}`}>
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
            <span className="text-white">
              {msg.text}
            </span>
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
            <div className="w-7 h-7 rounded-full bg-neutral-700">
                <span className="text-xs text-neutral-300">{watcher.username?.substring(0,2).toUpperCase()}</span>
            </div>
        </div>
        <span className="text-sm text-neutral-300">{watcher.username}</span>
    </div>
);


const StreamChat = ({ messages, activeTab, onTabChange, viewerCount, onSendMessage, localParticipantIdentity }) => {
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef(null); // Ref for the scrollable div that contains messages
  const chatEndRef = useRef(null);      // Ref for the empty div at the end of messages list

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessagesSinceScrollUp, setNewMessagesSinceScrollUp] = useState(0);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    // Scrolls the chatEndRef into view within the chatContainerRef
    chatEndRef.current?.scrollIntoView({ behavior: behavior });
    setIsAtBottom(true); // Assume we are at bottom after explicitly scrolling
    setNewMessagesSinceScrollUp(0); // Reset new message count
  }, []);

  // Effect to handle auto-scrolling or incrementing new message count when `messages` prop changes
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setIsAtBottom(true);
      setNewMessagesSinceScrollUp(0);
      return;
    }

    // Check if the effect is running due to a truly new message
    // This checks if the timestamp of the last message is newer than the second to last,
    // or if it's the only message.
    const lastMessage = messages[messages.length - 1];
    const secondLastMessage = messages[messages.length - 2];
    // Consider it a new message if it's the first, or newer than previous
    const isNewMessageAdded = !secondLastMessage || new Date(lastMessage.timestamp) > new Date(secondLastMessage.timestamp);


    if (isAtBottom) {
      // If already at bottom, scroll to new message (usually instant)
      scrollToBottom("auto");
    } else if (isNewMessageAdded && (activeTab === 'chat' || activeTab === 'chat-visible-mobile')) {
      // If not at bottom and a new message arrived for the active chat tab, increment counter
      setNewMessagesSinceScrollUp(prev => prev + 1);
    }
  }, [messages, isAtBottom, scrollToBottom, activeTab]); // Added activeTab to only count new messages if chat is visible

  // Effect for initial scroll to bottom when chat tab becomes active or messages first load
  useEffect(() => {
    if (activeTab === 'chat' || activeTab === 'chat-visible-mobile') {
      // A small delay can sometimes help ensure layout is complete
      setTimeout(() => scrollToBottom("auto"), 50);
    }
  }, [activeTab, scrollToBottom]); // Run when activeTab changes

  // Scroll event listener for the chat container to detect user scrolling
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = 30; // How many pixels from bottom to still be considered "at bottom"
      const userIsAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      
      if (userIsAtBottom !== isAtBottom) { // Only update state if it changed
          setIsAtBottom(userIsAtBottom);
      }

      if (userIsAtBottom) { // If user scrolls to bottom, clear new message counter
        setNewMessagesSinceScrollUp(0);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isAtBottom]); // Rerun if isAtBottom changes to ensure correct comparison in handler


  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage);
      setNewMessage('');
      // If user is near the bottom or was at bottom when sending, scroll them down.
      if (isAtBottom || (chatContainerRef.current && chatContainerRef.current.scrollHeight - chatContainerRef.current.scrollTop - chatContainerRef.current.clientHeight < 150)) {
        setTimeout(() => scrollToBottom("smooth"), 50); // Small delay for message to render
      }
    }
  };

  const watchers = Array.from({length: Math.min(viewerCount || 0, 20)}, (_, i) => ({id: `w${i}`, username: `Watcher${i+1}`}));

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Tabs */}
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
          <FiUsers size={14}/> Watching ({viewerCount || 0})
        </button>
      </div>

      {/* Message List / Watcher List container with ref */}
      <div className="relative flex-grow overflow-y-auto" ref={chatContainerRef}>
        <div className="p-2 sm:p-3 space-y-0"> {/* Inner padding for messages */}
          {(activeTab === 'chat' || activeTab === 'chat-visible-mobile') && messages.map(msg => (
            <ChatMessage key={msg.id} msg={msg} localParticipantIdentity={localParticipantIdentity} />
          ))}
          {activeTab === 'watching' && watchers.map(w => <WatcherItem key={w.id} watcher={w} />)}
          <div ref={chatEndRef} style={{ height: '1px' }} /> {/* Target for scrolling to bottom */}
        </div>

        {/* New Messages Indicator/Button */}
        {newMessagesSinceScrollUp > 0 && (activeTab === 'chat' || activeTab === 'chat-visible-mobile') && (
          <div className="sticky bottom-3 left-1/2 -translate-x-1/2 z-10 w-auto opacity-90 hover:opacity-100 transition-opacity">
            <button
              onClick={() => scrollToBottom("smooth")}
              className="btn btn-xs sm:btn-sm btn-info normal-case shadow-lg bg-blue-500 hover:bg-blue-400 text-white rounded-full px-3 py-1 h-auto min-h-0"
            >
              <FiArrowDownCircle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {newMessagesSinceScrollUp} New Message{newMessagesSinceScrollUp > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      {(activeTab === 'chat' || activeTab === 'chat-visible-mobile') && (
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