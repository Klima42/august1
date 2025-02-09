// src/AIChatAssistant.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Send } from 'lucide-react';

const thinkingMessages = [
  "Let me ponder that...", "Thinking out loud...", "Crunching the numbers...",
  "Diving into the data...", "Consulting my algorithms...", "Let me check...",
  "Peeking at the knowledge base...", "Just a moment...", "Whispering to the servers...",
  "Searching my brain..."
];

const AIChatAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  const generateThinkingMessage = () =>
    thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];

  useEffect(() => {
    const storedMessages = localStorage.getItem('chatHistory');
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    } else {
      setMessages([{
        id: 'welcome', type: 'ai',
        content: `**Hi! I'm ChefGPT** 🍽️ - Your culinary assistant\n\nI can help with creating detailed recipes and answering food-related questions. Ask me anything about ingredients or cooking techniques!`
      }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);


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
        body: JSON.stringify({ messages: updatedMessages })
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

        <div className="h-96 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

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

              </div>

        </div>

    </motion.div>
  );
};

export default AIChatAssistant;