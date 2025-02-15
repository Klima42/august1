import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Send, ImagePlus, XCircle, Plus, Menu, Trash2, MessageSquare, UserCircle } from 'lucide-react';

const thinkingMessages = [
  "Let me cook up something special...",
  "Analyzing your request...",
  "Consulting my culinary knowledge...",
  "Preparing your response...",
  "Simmering on that thought..."
];

const AIChatAssistant = () => {
  // Profile-specific states
  const [activeProfile, setActiveProfile] = useState(null);
  const [profileConversations, setProfileConversations] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  
  // UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageAnalysis, setImageAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [canSend, setCanSend] = useState(true);
  
  const lastRequestTime = useRef(0);
  const REQUEST_COOLDOWN = 2000;
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load profile and its conversations
  useEffect(() => {
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      setActiveProfile(profile);
      
      // Load profile-specific conversations
      const profileChats = localStorage.getItem(`profile_${profile.id}_conversations`);
      if (profileChats) {
        const chats = JSON.parse(profileChats);
        setProfileConversations(chats);
        
        // Set active conversation
        const lastActiveId = localStorage.getItem(`profile_${profile.id}_activeConversation`);
        if (lastActiveId && chats[lastActiveId]) {
          setActiveConversationId(lastActiveId);
        } else if (Object.keys(chats).length > 0) {
          setActiveConversationId(Object.keys(chats)[0]);
        }
      } else {
        // Create initial conversation for new profile
        const initialConversation = {
          id: 'welcome',
          title: 'Welcome',
          messages: [{
            id: 'welcome',
            type: 'ai',
            content: `**Bonjour ${profile.name}!** I'm excited to help with your culinary journey. As a ${profile.cookingLevel ? `level ${profile.cookingLevel}` : ''} chef${profile.dietaryRestrictions?.length ? ' with specific dietary preferences' : ''}, I'll make sure to tailor my suggestions to your needs.`
          }],
          createdAt: Date.now(),
          lastUpdated: Date.now()
        };
        
        setProfileConversations({ welcome: initialConversation });
        setActiveConversationId('welcome');
      }
    }
  }, []);

  // Save conversations when they change
  useEffect(() => {
    if (activeProfile && Object.keys(profileConversations).length > 0) {
      localStorage.setItem(
        `profile_${activeProfile.id}_conversations`,
        JSON.stringify(profileConversations)
      );
      if (activeConversationId) {
        localStorage.setItem(
          `profile_${activeProfile.id}_activeConversation`,
          activeConversationId
        );
      }
    }
  }, [profileConversations, activeConversationId, activeProfile]);

  // Scroll to bottom effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [profileConversations]);

  const createNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    const welcomeMessage = `**Bonjour ${activeProfile?.name}!** What can I help you with today?`;

    const newConversation = {
      id: newId,
      title: 'New Conversation',
      messages: [{
        id: 'welcome',
        type: 'ai',
        content: welcomeMessage
      }],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    setProfileConversations(prev => ({
      ...prev,
      [newId]: newConversation
    }));
    setActiveConversationId(newId);
    setIsSidebarOpen(false);
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setIsAnalyzing(true);
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1];
        try {
          const response = await fetch('/.netlify/functions/moondream-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64String })
          });

          if (!response.ok) throw new Error('Image analysis failed');

          const data = await response.json();
          setImageAnalysis(data.caption);
        } catch (error) {
          console.error('Error analyzing image:', error);
          setImageAnalysis('Failed to analyze image');
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setImageAnalysis('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!canSend || (!currentMessage.trim() && !selectedImage) || !activeConversationId) return;

    const now = Date.now();
    if (now - lastRequestTime.current < REQUEST_COOLDOWN) {
      console.warn("Please wait before sending another message.");
      return;
    }
    lastRequestTime.current = now;
    setIsLoading(true);
    setCanSend(false);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage,
      imageUrl: previewUrl,
    };

    // Update conversation with user message
    setProfileConversations(prev => ({
      ...prev,
      [activeConversationId]: {
        ...prev[activeConversationId],
        messages: [...prev[activeConversationId].messages, userMessage],
        lastUpdated: Date.now()
      }
    }));
    
    setCurrentMessage('');
    
    if (selectedImage) {
      clearSelectedImage();
    }

    try {
      const response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...profileConversations[activeConversationId].messages, userMessage],
          imageAnalysis: imageAnalysis,
          userProfile: activeProfile
        })
      });

      if (!response.ok) throw new Error('Chat request failed');

      const data = await response.json();
      const aiResponse = `${data.content}\n\n_— Auguste_`;
      
      // Update conversation with AI response
      setProfileConversations(prev => ({
        ...prev,
        [activeConversationId]: {
          ...prev[activeConversationId],
          messages: [...prev[activeConversationId].messages, {
            id: Date.now() + 1,
            type: 'ai',
            content: aiResponse
          }],
          lastUpdated: Date.now()
        }
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to conversation
      setProfileConversations(prev => ({
        ...prev,
        [activeConversationId]: {
          ...prev[activeConversationId],
          messages: [...prev[activeConversationId].messages, {
            id: Date.now(),
            type: 'ai',
            content: "⚠️ Mon dieu! I'm having trouble connecting. Please try again later!",
            isError: true
          }],
          lastUpdated: Date.now()
        }
      }));
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setCanSend(true);
      }, REQUEST_COOLDOWN);
    }
  };

  const generateThinkingMessage = () => 
    thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex bg-gradient-to-b from-[#FFF5EB] to-[#FFF0E0]"
    >
      {/* Mobile Overlay Background */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar with profile info and conversations */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 1024) && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-[#E5D3B3] flex flex-col z-30 lg:relative lg:translate-x-0"
          >
            {/* Profile Info */}
            {activeProfile && (
              <div className="p-4 border-b border-[#E5D3B3] bg-[#FFF5EB]">
                <div className="flex items-center gap-3">
                  <UserCircle className="w-8 h-8 text-[#B87333]" />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-800 truncate">
                      {activeProfile.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Level {activeProfile.cookingLevel} Chef
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {Object.values(profileConversations)
                .sort((a, b) => b.lastUpdated - a.lastUpdated)
                .map(conversation => (
                  <div
                    key={conversation.id}
                    className={`p-3 border-b border-[#E5D3B3] cursor-pointer hover:bg-[#FFF5EB] flex items-center justify-between transition-colors ${
                      conversation.id === activeConversationId ? 'bg-[#FFF0E0]' : ''
                    }`}
                    onClick={() => {
                      setActiveConversationId(conversation.id);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MessageSquare className="w-5 h-5 text-[#B87333] flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-medium text-gray-800 truncate">
                          {conversation.title}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {conversation.messages[conversation.messages.length - 1]?.content.slice(0, 30)}...
                        </div>
                      </div>
                    </div>
                    {conversation.id !== 'welcome' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConversationToDelete(conversation.id);
                          setShowDeleteModal(true);
                        }}
                        className="p-1 hover:bg-[#FFF0E0] rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-[#B87333]" />
                      </button>
                    )}
                  </div>
                ))}
            </div>

            {/* New Conversation Button */}
            <div className="p-4 border-t border-[#E5D3B3]">
              <button
                onClick={createNewConversation}
                className="w-full flex items-center justify-center gap-2 p-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A66323] transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Conversation
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5D3B3] bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#FFF5EB] rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-[#B87333]" />
            </button>
            <span className="text-[#B87333] text-xl">👨‍🍳</span>
            <h3 className="font-semibold text-gray-800">Auguste - Your Personal Chef</h3>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeConversationId &&
            profileConversations[activeConversationId]?.messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'user' && message.imageUrl && (
                  <img
                    src={message.imageUrl}
                    alt="User uploaded"
                    className="max-h-24 w-auto rounded-lg object-cover self-end shadow-md"
                  />
                )}
                <div className={`max-w-2xl p-4 rounded-xl ${
                  message.type === 'user'
                    ? 'bg-white border border-[#E5D3B3] ml-12'
                    : 'bg-[#FFF5EB] border border-[#E5D3B3] mr-12'
                } ${message.isError ? 'bg-red-50 border border-red-200' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {message.type === 'ai' && <span className="text-[#B87333] text-lg">👨‍🍳</span>}
                    <span className="text-sm font-medium text-gray-800">
                      {message.type === 'user' ? activeProfile?.name || 'You' : 'Auguste'}
                    </span>
                  </div>
                  <div className={`whitespace-pre-wrap ${message.isError ? 'text-red-600' : 'text-gray-700'}`}>
                    {message.content.split(/(\*\*.*?\*\*)/g).map((part, index) =>
                      part.startsWith('**') && part.endsWith('**') ? (
                        <strong key={index} className="font-semibold text-[#B87333]">{part.slice(2, -2)}</strong>
                      ) : (
                        <span key={index}>{part}</span>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-gray-600 p-4"
            >
              <Loader2 className="w-5 h-5 animate-spin text-[#B87333]" />
              <span>{generateThinkingMessage()}</span>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area with Image Preview */}
        <div className="border-t border-[#E5D3B3] p-4 bg-white">
          {previewUrl && (
            <AnimatePresence>
              <motion.div 
                className="mb-4"
                initial={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-24 w-auto rounded-lg object-cover shadow-md"
                  />
                  <button
                    onClick={clearSelectedImage}
                    className="absolute -top-2 -right-2 bg-white rounded-full shadow-md hover:bg-[#FFF5EB] transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-[#B87333]" />
                  </button>
                </div>
                {isAnalyzing && (
                  <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#B87333]" />
                    Analyzing image...
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-[#FFF5EB] rounded-lg text-[#B87333] hover:bg-[#FFF0E0] transition-colors"
            >
              <ImagePlus className="w-5 h-5" />
            </button>

            <textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Ask me about recipes or share a food photo..."
              className="flex-1 p-3 border border-[#E5D3B3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333] resize-none h-12"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            <motion.button
              onClick={handleSendMessage}
              className="p-3 bg-[#B87333] rounded-lg text-white shadow-md hover:bg-[#A66323] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              whileTap={{ scale: 0.95 }}
              disabled={isLoading || (!currentMessage.trim() && !selectedImage)}
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Delete Conversation</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setProfileConversations(prev => {
                      const newConversations = { ...prev };
                      delete newConversations[conversationToDelete];
                      
                      // If we're deleting the active conversation, switch to another one
                      if (conversationToDelete === activeConversationId) {
                        const remainingIds = Object.keys(newConversations);
                        if (remainingIds.length > 0) {
                          setActiveConversationId(remainingIds[0]);
                        } else {
                          createNewConversation();
                        }
                      }
                      
                      return newConversations;
                    });
                    setShowDeleteModal(false);
                    setConversationToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AIChatAssistant;