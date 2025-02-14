import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Send, ImagePlus, XCircle, Plus, Menu, Trash2, MessageSquare } from 'lucide-react';

const thinkingMessages = [
  "Let me cook up something special...",
  "Analyzing your request...",
  "Consulting my culinary knowledge...",
  "Preparing your response...",
  "Simmering on that thought..."
];

const AIChatAssistant = () => {
  // State for conversations management
  const [conversations, setConversations] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  
  // Original states
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

  // Scroll to bottom effect
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  // Load conversations from localStorage
  useEffect(() => {
    const storedConversations = localStorage.getItem('conversations');
    const storedActiveId = localStorage.getItem('activeConversationId');
    
    if (storedConversations) {
      setConversations(JSON.parse(storedConversations));
      if (storedActiveId) {
        setActiveConversationId(storedActiveId);
      }
    } else {
      // Create initial conversation
      const initialConversation = {
        id: 'welcome',
        title: 'Welcome',
        messages: [{
          id: 'welcome',
          type: 'ai',
          content: `**Bonjour! I'm Auguste** 🍽️ - Your culinary assistant\n\nI can help with creating detailed recipes, analyzing food photos, and answering cooking questions. Feel free to share images or ask about any culinary topic!`
        }],
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
      
      setConversations({ welcome: initialConversation });
      setActiveConversationId('welcome');
    }
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (Object.keys(conversations).length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
      localStorage.setItem('activeConversationId', activeConversationId);
    }
  }, [conversations, activeConversationId]);

  const createNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    const newConversation = {
      id: newId,
      title: 'New Conversation',
      messages: [{
        id: 'welcome',
        type: 'ai',
        content: `**Bonjour!** What can I help you with today?`
      }],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    setConversations(prev => ({
      ...prev,
      [newId]: newConversation
    }));
    setActiveConversationId(newId);
    setIsSidebarOpen(false); // Close sidebar on mobile after creating new conversation
  };

  const deleteConversation = (id) => {
    setConversationToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setConversations(prev => {
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
    setIsSidebarOpen(false); // Close sidebar on mobile after deleting conversation
  };

  const generateThinkingMessage = () =>
    thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];

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
    setConversations(prev => ({
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
          messages: [...conversations[activeConversationId].messages, userMessage],
          imageAnalysis: imageAnalysis,
        })
      });

      if (!response.ok) throw new Error('Chat request failed');

      const data = await response.json();
      const aiResponse = `${data.content}\n\n_— Auguste_`;
      
      // Update conversation with AI response
      setConversations(prev => ({
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
      // Add error message to conversation
      setConversations(prev => ({
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

  // Get current conversation messages
  const currentMessages = activeConversationId ? conversations[activeConversationId]?.messages || [] : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex bg-white"
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

      {/* Sidebar - Modified for mobile */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 1024) && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-gray-50 border-r flex flex-col z-30 lg:relative lg:translate-x-0"
          >
            <div className="p-4 border-b flex justify-between items-center bg-white">
              <h2 className="font-semibold">Conversations</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={createNewConversation}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="New conversation"
                >
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {Object.values(conversations)
                .sort((a, b) => b.lastUpdated - a.lastUpdated)
                .map(conversation => (
                  <div
                    key={conversation.id}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                      conversation.id === activeConversationId ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      setActiveConversationId(conversation.id);
                      setIsSidebarOpen(false); // Close sidebar on mobile after selecting conversation
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MessageSquare className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-medium truncate">{conversation.title}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {conversation.messages[conversation.messages.length - 1]?.content.slice(0, 30)}...
                        </div>
                      </div>
                    </div>
                    {conversation.id !== 'welcome' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded-lg"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
            <span className="text-blue-600 text-xl">🍽️</span>
            <h3 className="font-semibold">Auguste - Your Culinary AI</h3>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {currentMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: message.type === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'user' && message.imageUrl && (
                    <img
                      src={message.imageUrl}
                      alt="User uploaded"
                      className="max-h-24 w-auto rounded-lg object-cover self-end"
                    />
                  )}
                  <div className={`max-w-2xl p-4 rounded-xl ${
                    message.type === 'user' ? 'bg-blue-100 ml-12' : 'bg-gray-100 mr-12'
                  } ${message.isError ? 'bg-red-50 border border-red-100' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {message.type === 'ai' && <span className="text-blue-600 text-lg">🍽️</span>}
                      <span className="text-sm font-medium">
                        {message.type === 'user' ? 'You' : 'Auguste'}
                      </span>
                    </div>
                    <div className={`whitespace-pre-wrap ${message.isError ? 'text-red-600' : 'text-gray-700'}`}>
                      {message.content.split(/(\*\*.*?\*\*)/g).map((part, index) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={index}>{part}</span>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-gray-500 p-4"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{generateThinkingMessage()}</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4 bg-gray-50">
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
                      className="h-24 w-auto rounded-lg object-cover"
                    />
                    <button
                      onClick={clearSelectedImage}
                      className="absolute -top-2 -right-2 bg-white rounded-full shadow-md"
                      aria-label="Remove image"
                    >
                      <XCircle className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  {isAnalyzing && (
                    <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
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
                className="p-3 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                aria-label="Upload image"
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Ask me about recipes or share a food photo..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none h-12 overflow-hidden"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              <motion.button
                onClick={handleSendMessage}
                className="p-3 bg-blue-500 rounded-lg text-white shadow-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileTap={{ scale: 0.95 }}
                disabled={isLoading || (!currentMessage.trim() && !selectedImage)}
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
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
              <p className="text-gray-600 mb-4">Are you sure you want to delete this conversation? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
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