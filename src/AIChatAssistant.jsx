import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Send, ImagePlus, XCircle } from 'lucide-react';

const thinkingMessages = [
  "Let me cook up something special...",
  "Analyzing your request...",
  "Consulting my culinary knowledge...",
  "Preparing your response...",
  "Simmering on that thought..."
];

const AIChatAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageAnalysis, setImageAnalysis] = useState(''); // Store Moondream analysis.
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [canSend, setCanSend] = useState(true); // For rate limiting.
  const lastRequestTime = useRef(0); // For rate limiting.
  const REQUEST_COOLDOWN = 2000; // 2-second cooldown.
  const fileInputRef = useRef(null);

  const generateThinkingMessage = () =>
    thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];

  useEffect(() => {
      // Load chat history (same as before)
       const storedMessages = localStorage.getItem('chatHistory');
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    } else {
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: `**Bonjour! I'm Auguste** 🍽️ - Your culinary assistant\n\nI can help with creating detailed recipes, analyzing food photos, and answering cooking questions. Feel free to share images or ask about any culinary topic!`
      }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setIsAnalyzing(true); // Show spinner.
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Convert to base64.
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1];
        try {
          // Call Moondream *immediately*.
          const response = await fetch('/.netlify/functions/moondream-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64String })
          });

          if (!response.ok) throw new Error('Image analysis failed');

          const data = await response.json();
          setImageAnalysis(data.caption); // Store the analysis result!
        } catch (error) {
          console.error('Error analyzing image:', error);
          setImageAnalysis('Failed to analyze image'); // Store error message.
        } finally {
          setIsAnalyzing(false); // Hide spinner.
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setImageAnalysis(''); // Clear the analysis when the image is cleared.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
      if (!canSend || (!currentMessage.trim() && !selectedImage)) return;

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

    const tempMessages = [...messages, userMessage];

    // Clear *before* sending.
    // Do NOT clear imageAnalysis here.
    setCurrentMessage('');

    try {
      // Single call to ai-chat, including imageAnalysis.
      const response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: tempMessages,
          imageAnalysis: imageAnalysis, // Send the *stored* analysis.
        })
      });

      if (!response.ok) throw new Error('Chat request failed');

      const data = await response.json();
      const aiResponse = `${data.content}\n\n_— Auguste_`;
       setMessages([...tempMessages, {
                id: Date.now() + 1,
                type: 'ai',
                content: aiResponse
            }]);
    } catch (error) {
      setMessages([...tempMessages, { // Update state even on error.
        id: Date.now(),
        type: 'ai',
        content: "⚠️ Mon dieu! I'm having trouble connecting. Please try again later!",
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      clearSelectedImage(); // NOW we clear the image.
      setTimeout(() => {
        setCanSend(true);
      }, REQUEST_COOLDOWN);
    }
  };

  return (
    // ... (JSX remains the same, except for removing the image analysis display)
     <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-xl bg-white shadow-lg mt-6"
        >
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <span className="text-blue-600 text-xl">🍽️</span>
                    <h3 className="font-semibold">Auguste - Your Culinary AI</h3>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                >
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
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.type === 'user' && message.imageUrl && (
                                    <img
                                        src={message.imageUrl}
                                        alt="User uploaded"
                                        className="max-h-24 w-auto rounded-lg object-cover self-end" // Aligns to the bottom of the flex container.
                                    />
                                )}
                                <div className={`max-w-md p-4 rounded-xl ${message.type === 'user' ? 'bg-blue-100 ml-12' : 'bg-gray-100 mr-12'
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
                </div>

                <div className="border-t p-4 bg-gray-50">
                    {previewUrl && (
                        <div className="mb-4">
                            <div className="relative inline-block">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="h-24 w-auto rounded-lg object-cover"
                                />
                                <button
                                    onClick={clearSelectedImage}
                                    className="absolute -top-2 -right-2 bg-white rounded-full shadow-md"
                                >
                                    <XCircle className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                             {isAnalyzing && (  // Keep the analyzing indicator.
                <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing image...
                </div>
              )}
                        </div>
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
                        >
                            <Send className="w-5 h-5" />
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
  );
};

export default AIChatAssistant;