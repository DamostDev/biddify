import React, { useState } from 'react';
import { useParams } from 'react-router-dom'; // To get stream ID from URL
import StreamVideoPlayer from '../components/stream/StreamVideoPlayer';
import StreamChat from '../components/stream/StreamChat';
import StreamProductList from '../components/stream/StreamProductList';
import StreamAuctionControls from '../components/stream/StreamAuctionControls';
import StreamHeader from '../components/stream/StreamHeader';
import { FiCopy, FiShare2, FiVolumeX, FiVolume2, FiMoreVertical, FiCreditCard, FiX, FiMessageSquare, FiUsers } from 'react-icons/fi'; // Example Icons

// Mock data - replace with actual API calls and WebSocket data
const mockStreamDetails = {
  id: '123',
  title: '270+ PAIR MARATHON 👟 $1 STARTS JOIN RN',
  host: {
    username: 'zarthsupply',
    avatarUrl: 'https://i.pravatar.cc/40?u=zarthsupply',
    rating: 4.8,
    isFollowed: false, // You'd get this from user's state
  },
  viewerCount: 145,
  streamUrl: 'www.whatnot.com/live/...', // Placeholder
  currentProduct: {
    name: 'SIZE 10 - UNION LA X NIKE DUNK LOW "BLUE ARGON PASSPORT PACK"',
    bids: 32,
    condition: 'LIGHTLY USED - NO BOX - ($180+ MARKET)',
    shippingInfo: 'Not shippable to you', // Example, could be complex
    imageUrl: 'https://images.unsplash.com/photo-1608319294864-f StagazerZ?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80', // Placeholder image
    currentBid: 67,
    timeLeft: '00:12', // MM:SS
    userBid: 72, // The current user's potential bid
  },
  products: [
    { id: 'p1', name: 'SIZE 1Y - JORDAN 1 MID SE "INDUSTRIAL BLUE"', available: 1, condition: 'PRE OWNED - NO BOX', price: '$1 Starting price' },
    { id: 'p2', name: 'SIZE 2Y - JORDAN 12 RETRO "BARONS" (PS)', available: 1, condition: 'PRE OWNED - NO BOX - (LOWEST ASK $100+)', price: '$1 Starting price' },
    { id: 'p3', name: 'SIZE 3.5M / 5W - ALEXANDER MCQUEEN OVERSIZED SNEAKERS "WHITE BLACK"', available: 1, condition: 'NEW - BOX DAMAGE', price: '$250 Buy Now' },
    // ... more products
  ],
};

const mockChatMessages = [
    { id: 'c1', user: { username: 'caliwayv3', avatar: 'https://i.pravatar.cc/30?u=cali3', isMod: true }, text: 'SIZE 7Y / 8.5W - JORDAN 4 RETRO "LIGHTNING" (2021) (GS)' },
    { id: 'c2', user: { username: 'caliwayv3', avatar: 'https://i.pravatar.cc/30?u=cali3', isMod: true }, text: "I'm always green brotha" },
    { id: 'c3', user: { username: 'litke', avatar: 'https://i.pravatar.cc/30?u=litke' }, text: 'Size 10?', highlight: true }, // Example highlight
    { id: 'c4', user: { username: 'lostcausejoel', avatar: 'https://i.pravatar.cc/30?u=joel' }, text: 'ima get you bro' },
    { id: 'c5', user: { username: 'lambokiller', avatar: 'https://i.pravatar.cc/30?u=lambo' }, text: 'Yeezy 700 sz 11.5' },
];


const StreamPage = () => {
  const { streamId } = useParams(); // Get streamId from URL if your route is /stream/:streamId
  const [streamData, setStreamData] = useState(mockStreamDetails); // Will be fetched
  const [chatMessages, setChatMessages] = useState(mockChatMessages); // Will come from WebSocket
  const [isMuted, setIsMuted] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(true); // Example state
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'watching'

  // TODO: useEffect to fetch stream data based on streamId
  // TODO: useEffect to connect to WebSocket for chat and real-time updates

  if (!streamData) {
    return <div className="flex h-screen items-center justify-center bg-black"><span className="loading loading-lg loading-dots text-white"></span></div>;
  }

  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">
      {/* Optional: Minimalist header if not using the global one */}
      <StreamHeader streamData={streamData} />

      <div className="flex flex-1 overflow-hidden">
        {/* --- Left Panel (Stream Info & Product List) --- */}
        <aside className="hidden md:flex flex-col w-80 lg:w-96 bg-black border-r border-neutral-800 overflow-y-auto">
          <StreamProductList streamTitle={streamData.title} products={streamData.products} />
        </aside>

        {/* --- Center Panel (Video & Auction/Product Controls) --- */}
        <main className="flex-1 flex flex-col bg-black relative overflow-hidden">
          <StreamVideoPlayer isMuted={isMuted} onToggleMute={toggleMute} thumbnailUrl={streamData.currentProduct?.imageUrl || streamData.products[0]?.imageUrl} />
          {showPhoneVerification && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 p-6 text-center mx-auto max-w-md rounded-lg backdrop-blur-sm">
                <p className="text-lg mb-3">In order to participate in this stream, you need to</p>
                <button className="btn btn-primary btn-outline border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white normal-case">
                    Verify your phone number first
                </button>
                <button onClick={() => setShowPhoneVerification(false)} className="btn btn-xs btn-ghost absolute top-2 right-2"><FiX/></button>
            </div>
          )}
          {streamData.currentProduct && (
            <StreamAuctionControls product={streamData.currentProduct} />
          )}
        </main>

        {/* --- Right Panel (Chat & Watching List) --- */}
        <aside className="w-full fixed bottom-0 left-0 h-[45vh] bg-black border-t border-neutral-800 
                        md:static md:flex md:flex-col md:w-80 lg:w-96 md:h-full md:border-t-0 md:border-l md:translate-x-0 transition-transform duration-300 ease-in-out z-20
                        transform ${activeTab === 'chat-visible-mobile' ? 'translate-y-0' : 'translate-y-full'} md:translate-y-0"
        > {/* Basic mobile chat pop-up logic */}
          <StreamChat
            messages={chatMessages}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            viewerCount={streamData.viewerCount}
          />
        </aside>
      </div>
        {/* Mobile: Buttons to toggle chat/product list if they are overlays */}
        <div className="md:hidden fixed bottom-4 right-4 z-30 space-x-2">
            <button
                onClick={() => setActiveTab(prev => prev === 'chat-visible-mobile' ? 'chat' : 'chat-visible-mobile')}
                className="btn btn-neutral btn-circle shadow-lg"
            >
                <FiMessageSquare size={20}/>
            </button>
            {/* Add button for product list on mobile if needed */}
        </div>
    </div>
  );
};

export default StreamPage;