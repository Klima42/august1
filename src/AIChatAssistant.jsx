// src/AIChatAssistant.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Rocket, ClipboardList, Loader2, X, Send } from 'lucide-react';

const thinkingMessages = [
  "Let me ponder that...", "Thinking out loud...", "Crunching the numbers...",
  "Diving into the data...", "Consulting my algorithms...", "Let me check...",
  "Peeking at the knowledge base...", "Just a moment...", "Whispering to the servers...",
  "Searching my brain..."
];

const AIChatAssistant = ({ company, domain, companies }) => {
  // State and logic for the chat window (ChefGPT)
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(company);
  const [currentMessage, setCurrentMessage] = useState('');
  // State for scrolling
  const messagesEndRef = useRef(null);

  // New state to select which window to display: chat or image analysis.
  const [activeWindow, setActiveWindow] = useState('chat'); // 'chat' or 'image'

  // States for image analysis (Moondream)
  const [imageData, setImageData] = useState(''); // holds raw base64 (without data URL prefix)
  const [imageAnalysis, setImageAnalysis] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);

  const generateThinkingMessage = () =>
    thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];

  useEffect(() => {
    const storedMessages = localStorage.getItem(`chatHistory_${selectedCompany}`);
    if (storedMessages)
      setMessages(JSON.parse(storedMessages));
    else
      setMessages([{
        id: 'welcome', type: 'ai',
        content: `**Hi! I'm ChefGPT** 🍽️ - Your culinary assistant\n\nI can help with creating detailed recipes and answering food-related questions. Ask me anything about ingredients or cooking techniques!`
      }]);
  }, [selectedCompany]);

  useEffect(() => {
    localStorage.setItem(`chatHistory_${selectedCompany}`, JSON.stringify(messages));
  }, [messages, selectedCompany]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // Chat window functions
  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    setIsLoading(true);
    const userMessage = { id: Date.now(), type: 'user', content: currentMessage };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, company: selectedCompany, domain: domain || 'unknown' })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const aiResponse = `${data.content}\n\n_— ChefGPT_`;
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now(), type: 'ai', content: "⚠️ Hmm, I'm having trouble connecting. Please try again later!", isError: true }]);
    } finally {
      setIsLoading(false);
      setCurrentMessage('');
    }
  };

  const getAIAnalysis = async (type) => {
    setIsLoading(true);
    const updatedMessages = [...messages, { id: Date.now(), type: 'user', content: generateThinkingMessage(), analysisType: type }];
    setMessages(updatedMessages);

    try {
      const response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: type, company: selectedCompany, messages: updatedMessages, domain: domain || 'unknown' })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const aiResponse = `${data.content}\n\n_— ChefGPT_`;
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: aiResponse, analysisType: type }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now(), type: 'ai', content: "⚠️ Hmm, I'm having trouble connecting. Please try again later!", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Image Analysis functions using Moondream API (new window)
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        // Strip off the Data URL prefix, keeping only the base64 string.
        if (result.startsWith("data:")) {
          const base64 = result.split(",")[1];
          setImageData(base64);
        } else {
          setImageData(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSubmit = async () => {
    if (!imageData) return;
    setIsImageLoading(true);
    setImageAnalysis('');
    try {
      const response = await fetch('/.netlify/functions/moondream-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageData })
      });

      if (!response.ok) throw new Error('Image analysis request failed');

      const data = await response.json();
      setImageAnalysis(data.caption);
    } catch (error) {
      setImageAnalysis("⚠️ I'm having trouble processing the image.");
    } finally {
      setIsImageLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="border rounded-xl bg-white shadow-lg mt-6">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-xl">🍽️</span>
          <h3 className="font-semibold">ChefGPT</h3>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      {/* Tab Switcher */}
      <div className="flex border-b">
        <button 
          onClick={() => setActiveWindow('chat')} 
          className={`flex-1 px-4 py-2 ${activeWindow === 'chat' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
          ChefGPT Chat
        </button>
        <button 
          onClick={() => setActiveWindow('image')} 
          className={`flex-1 px-4 py-2 ${activeWindow === 'image' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Moondream Analysis
        </button>
      </div>
      {isOpen && (
        <div className="h-96 flex flex-col">
          {activeWindow === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {companies?.length > 1 && (
                  <div className="flex gap-2 pb-2 flex-wrap">
                    {companies.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCompany(c)}
                        className={`px-3 py-1 rounded-lg text-sm ${selectedCompany === c ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, x: message.type === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md p-4 rounded-xl ${message.type === 'user' ? 'bg-blue-100 ml-12' : 'bg-gray-100 mr-12'} ${message.isError ? 'bg-red-50 border border-red-100' : ''}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {message.type === 'ai' && <span className="text-blue-600 text-lg">🍽️</span>}
                          <span className="text-sm font-medium">{message.type === 'user' ? 'You' : 'ChefGPT'}</span>
                        </div>
                        <div className={`whitespace-pre-wrap ${message.isError ? 'text-red-600' : 'text-gray-700'}`}>
                          {message.content.split(/(\*\*.*?\*\*)/g).map((part, index) =>
                            part.startsWith('**') && part.endsWith('**')
                              ? (<strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>)
                              : (<span key={index}>{part}</span>)
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </AnimatePresence>
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-gray-500 p-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{generateThinkingMessage()}</span>
                  </motion.div>
                )}
              </div>
              <div className="border-t p-4 bg-gray-50">
                <div className="flex gap-2 mb-4">
                  <textarea 
                    value={currentMessage} 
                    onChange={(e) => setCurrentMessage(e.target.value)} 
                    placeholder="Type your message to ChefGPT..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none h-12 overflow-hidden"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  />
                  <motion.button 
                    onClick={handleSendMessage} 
                    className="p-3 bg-blue-500 rounded-lg text-white shadow-md hover:bg-blue-600 transition-colors" 
                    whileTap={{ scale: 0.95 }}>
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    onClick={() => getAIAnalysis('domainValidation')} 
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border transition-all" 
                    disabled={isLoading}>
                    <Wand2 className="w-4 h-4" />Domain Analysis
                  </button>
                  <button 
                    onClick={() => getAIAnalysis('outreachStrategy')} 
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border transition-all" 
                    disabled={isLoading}>
                    <Rocket className="w-4 h-4" />Outreach Plan
                  </button>
                  <button 
                    onClick={() => getAIAnalysis('techStackPrediction')} 
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border transition-all" 
                    disabled={isLoading}>
                    <ClipboardList className="w-4 h-4" />Tech Stack
                  </button>
                </div>
              </div>
            </>
          )}
          {activeWindow === 'image' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col items-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="mb-4" 
                />
                {imageData && (
                  <img src={`data:image/jpeg;base64,${imageData}`} alt="Uploaded preview" className="max-h-48 mb-4 rounded-md" />
                )}
                <button 
                  onClick={handleImageSubmit} 
                  className="px-4 py-2 bg-green-500 text-white rounded" 
                  disabled={isImageLoading || !imageData}>
                  {isImageLoading ? 'Analyzing...' : 'Analyze Image'}
                </button>
                {imageAnalysis && (
                  <div className="mt-4 p-4 bg-gray-100 rounded w-full text-center">
                    <p>{imageAnalysis}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default AIChatAssistant;
