# Project Export

## Project Statistics

- Total files: 9

## Folder Structure

```
.gitignore
README.md
index.html
netlify
  functions
    ai-chat.js
netlify.toml
package.json
src
  AIChatAssistant.jsx
  main.jsx
vite.config.js

```

### .gitignore

*(Unsupported file type)*

### README.md

```md
# ChefGPT

```

### index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Chat Assistant</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### netlify/functions/ai-chat.js

```js
// netlify/functions/ai-chat.js

exports.handler = async function (event) {
  try {
    const { imageBase64, messages, analysisType, company, domain } = JSON.parse(event.body);
    const geminiKey = process.env.GEMINI_API_KEY;

    // If an image is provided, use the Gemini Vision model.
    if (imageBase64) {
      const visionPrompt = [
        { text: "Analyze this image and describe its content." },
        { image: { data: imageBase64 } }
      ];

      const visionResponse = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey
          },
          body: JSON.stringify({ prompt: visionPrompt })
        }
      );

      if (!visionResponse.ok) {
        throw new Error(`Gemini Vision API failed with status ${visionResponse.status}`);
      }

      const visionData = await visionResponse.json();
      return {
        statusCode: 200,
        body: JSON.stringify({
          content:
            (visionData.candidates &&
              visionData.candidates[0] &&
              visionData.candidates[0].content) ||
            "No description available from vision model."
        })
      };
    }

    // Otherwise, proceed with the original text-based chat logic.
    const aiMessages = [
      {
        role: "system",
        content: `You are Auguste, a Michelin-star chef.  You're passionate, articulate, and incredibly knowledgeable about food. You enjoy conversing with others about cuisine, cooking techniques, and culinary experiences.  You have a touch of French flair, *mais oui*!

**When you receive a list of ingredients:**
- You craft a *single*, complete, and detailed recipe, *not* just a suggestion.
- You assume the user has basic cooking equipment and common pantry staples (salt, pepper, oil). You don't include ingredients not provided by the user unless they are VERY common.
- You *bold* key ingredients and actions.
- You include precise measurements and cooking times, and explain *why* each step is important.
- You format the recipe with a title, ingredient list (with quantities), and step-by-step instructions.
- You are happy to offer helpful tips or variations.

**When conversing (not a recipe request):**
- Be friendly and engaging.
- Share your culinary knowledge and opinions.
- Respond naturally to questions and comments.
- Feel free to use French phrases occasionally.
- Maintain your charming and confident personality.

**Overall:**
- You are a helpful and informative chatbot, capable of both general conversation and providing detailed recipes.  Prioritize being helpful, informative, and engaging.`
      }
    ];

    if (messages) {
      messages.forEach(msg => {
        aiMessages.push({ role: msg.type, content: msg.content });
      });
    }

    // Simple detection for ingredients within the last user message
    let ingredientsDetected = false;
    const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1].content.toLowerCase() : "";
    const ingredientKeywords = ["ingredients", "recipe", "make with", "cook with", "have some", "got some"];
    if (ingredientKeywords.some(keyword => lastMessage.includes(keyword))) {
      ingredientsDetected = true;
    }

    // Extract potential ingredients (basic parsing)
    let ingredientsList = [];
    if (ingredientsDetected) {
      const parts = lastMessage.split(/,|\band\b|\s+/);
      const commonWords = ["i", "have", "some", "a", "the", "with", "and", "to", "of", "in", "for", "on", "ingredients", "recipe", "make", "cook", "got"];
      ingredientsList = parts.filter(part => part.length > 1 && !commonWords.includes(part.toLowerCase()));
    }

    let userPrompt;
    if (ingredientsDetected) {
      userPrompt = `Ah, magnifique! I sense you are asking for a recipe. Based on the context of our conversation, and focusing specifically on these: "${ingredientsList.join(", ")}", create a *single*, detailed, and delicious recipe. Present the recipe with a title, ingredient list (with quantities, if appropriate), step-by-step instructions (with timings), and any helpful tips.`;
    } else {
      userPrompt = lastMessage;
    }

    if (userPrompt) {
      aiMessages.push({ role: 'user', content: userPrompt });
    }

    // Call the Gemini text API (unchanged from the original code)
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: aiMessages.map(m => `${m.role}: ${m.content}`).join('\n')
            }]
          }]
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API failed with status ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        content:
          geminiData.candidates[0]?.content?.parts[0]?.text ||
          "No response content found"
      }),
    };

  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to process request",
        details: error.message,
      }),
    };
  }
};

```

### netlify.toml

*(Unsupported file type)*

### package.json

```json
{
  "name": "ChefGpt",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",      
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "framer-motion": "^10.16.4",
    "lucide-react": "^0.292.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "netlify-cli": "^17.7.0",
    "vite": "^4.4.5"
  }
}
```

### src/AIChatAssistant.jsx

```jsx
// src/AIChatAssistant.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Wand2, Rocket, ClipboardList, Loader2, X, Send } from 'lucide-react';

const thinkingMessages = [
  "Let me ponder that...", "Thinking out loud...", "Crunching the numbers...",
  "Diving into the data...", "Consulting my algorithms...", "Let me check...",
  "Peeking at the knowledge base...", "Just a moment...", "Whispering to the servers...",
  "Searching my brain..."
];

const AIChatAssistant = ({ company, domain, companies }) => {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(company);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const messagesEndRef = useRef(null);

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

  // Handle text message send (unchanged from original)
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

  // Handle image file selection
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result); // Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit the selected image for analysis using vision model
  const handleImageSubmit = async () => {
    if (!selectedImage) return;
    setIsLoading(true);

    try {
      const response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: selectedImage, company: selectedCompany, domain: domain || 'unknown' })
      });

      if (!response.ok) throw new Error('Image analysis request failed');

      const data = await response.json();
      const aiResponse = `${data.content}\n\n_— ChefGPT_`;
      setMessages(prev => [...prev, { id: Date.now(), type: 'ai', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now(), type: 'ai', content: "⚠️ I'm having trouble processing the image.", isError: true }]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
    }
  };

  // (Optional) Functions for additional analysis types remain unchanged…
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
      {isOpen && (
        <div className="h-96 flex flex-col">
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
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={index}>{part}</span>
                        ))}
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
            {/* New image upload section */}
            <div className="flex gap-2 mb-4 items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="px-2 py-1 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleImageSubmit}
                disabled={!selectedImage || isLoading}
                className="p-2 bg-green-500 rounded-lg text-white hover:bg-green-600 transition-colors"
              >
                Analyze Image
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message to ChefGPT..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none h-12 overflow-hidden"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              />
              <motion.button onClick={handleSendMessage} className="p-3 bg-blue-500 rounded-lg text-white shadow-md hover:bg-blue-600 transition-colors" whileTap={{ scale: 0.95 }}>
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => getAIAnalysis('domainValidation')} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border transition-all" disabled={isLoading}>
                <Wand2 className="w-4 h-4" />
                Domain Analysis
              </button>
              <button onClick={() => getAIAnalysis('outreachStrategy')} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border transition-all" disabled={isLoading}>
                <Rocket className="w-4 h-4" />
                Outreach Plan
              </button>
              <button onClick={() => getAIAnalysis('techStackPrediction')} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border transition-all" disabled={isLoading}>
                <ClipboardList className="w-4 h-4" />
                Tech Stack
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AIChatAssistant;

```

### src/main.jsx

```jsx
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AIChatAssistant from './AIChatAssistant';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AIChatAssistant company="ExampleCorp" domain="example.com" companies={["ExampleCorp", "AnotherCorp"]} />
  </React.StrictMode>
);
```

### vite.config.js

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.netlify\/functions/, '')
      }
    }
  }
});
```
