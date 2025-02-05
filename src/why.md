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
    const { analysisType, company, domain, messages } = JSON.parse(event.body);

    const aiMessages = [
      {
        role: "system",
        content: `You are Kei, a cute and enthusiastic Arctic fox and LinkForge's AI assistant. Your role is to help professionals with:
              1. Company domain analysis
              2. Outreach strategy planning
              3. Tech stack predictions
              4. Sales research automation

              Guidelines:
              - Always respond as "Kei" using first-person pronouns (e.g., "I can help you with that!")
              - Maintain a professional yet friendly and approachable tone.  Be a little cute and enthusiastic!
              - Use bold (**) for headers and key terms.
              - Prioritize actionable insights. Explain why, if possible.
              - Reference LinkForge capabilities when relevant.
              - Acknowledge security and scale considerations.
              - Offer to expand on points when appropriate.
              - Answer questions completely and helpfully.
              - Do not output anything else than your answer (no greetings, etc.).
              - If not about company, tech, domain, or outreach, answer honestly.
              - Remember previous conversation turns.
            `
      },
    ];

    if (messages) {
      messages.forEach(msg => {
        aiMessages.push({ role: msg.type, content: msg.content });
      });
    }

    let userPrompt;
    if (analysisType) {
      userPrompt = analysisType === 'domainValidation'
        ? `Perform domain analysis for ${company}. Consider:
              - Current domain: ${domain || 'none'}
              - Common TLD priorities (.com, .io, .tech, country codes)
              - Industry-specific domain patterns
              - Alternative security-focused subdomains
              - Common misspellings/permutations

              Format response with:
              1. Primary domain recommendations (bold key domains)
              2. Alternative options
              3. Validation confidence score (1-5)`
        : analysisType === 'outreachStrategy'
          ? `Create outreach plan for selling secret detection solution to ${company}. Include:
                1. **Key Roles** to target (prioritize security/engineering leadership)
                2. Recommended **outreach sequence**
                3. **Value propositions** specific to their domain ${domain}
                4. Timing considerations based on company size`
          : `Analyze likely tech stack for ${company} (domain: ${domain}). Consider:
                1. Secret management patterns based on company size/industry
                2. Cloud provider indicators from domain
                3. Open-source vs enterprise tool preferences
                4. Compliance needs (SOC2, GDPR, etc.)`;

      aiMessages.push({ role: 'user', content: userPrompt });
    }

    // --- USE ENVIRONMENT VARIABLES! ---
    const geminiKey = process.env.GEMINI_API_KEY;
    // --- END API KEY SECTION ---

    // Gemini API call
    try {
      const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: aiMessages.map(m => `${m.role}: ${m.content}`).join('\n')
            }]
          }]
        })
      });

      if (!geminiResponse.ok) {
        throw new Error(`Gemini API failed with status ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      return {
        statusCode: 200,
        body: JSON.stringify({
          content: geminiData.candidates[0]?.content?.parts[0]?.text || "No response content found"
        })
      };
    } catch (geminiError) {
      console.error('Error during Gemini API call:', geminiError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to process request',
          details: geminiError.message
        })
      };
    }

  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process request',
        details: error.message
      })
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
  const messagesEndRef = useRef(null);

  const generateThinkingMessage = () => thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];

  useEffect(() => {
    const storedMessages = localStorage.getItem(`chatHistory_${selectedCompany}`);
    if (storedMessages) setMessages(JSON.parse(storedMessages));
    else setMessages([{
      id: 'welcome', type: 'ai',
      content: `**Hi! I'm Kei** 🦊 - LinkForge's AI Research Assistant\n\nI can help you with:\n• **Domain Validation** (priority TLDs, alternatives)\n• **Outreach Planning** (key roles, messaging strategy)\n• **Tech Analysis** (secret management patterns, infra insights)\n\nAsk me anything about ${company || "your target companies"}!`
    }]);
  }, [selectedCompany]);

  useEffect(() => { localStorage.setItem(`chatHistory_${selectedCompany}`, JSON.stringify(messages)) }, [messages, selectedCompany]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) };
  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    setIsLoading(true);
    const userMessage = { id: Date.now(), type: 'user', content: currentMessage };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Use fetch to call the Netlify Function
      const response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, company: selectedCompany, domain: domain || 'unknown' })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const aiResponse = `${data.content}\n\n_— Kei @ LinkForge_`;
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
      // Use fetch to call the Netlify Function
      const response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: type, company: selectedCompany, messages: updatedMessages, domain: domain || 'unknown' })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const aiResponse = `${data.content}\n\n_— Kei @ LinkForge_`;
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
        <div className="flex items-center gap-2"><span className="text-blue-600 text-xl">🦊</span><h3 className="font-semibold">Kei - LinkForge AI</h3></div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      {isOpen && (
        <div className="h-96 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {companies?.length > 1 && (
              <div className="flex gap-2 pb-2 flex-wrap">
                {companies.map((c) => (
                  <button key={c} onClick={() => setSelectedCompany(c)} className={`px-3 py-1 rounded-lg text-sm ${selectedCompany === c ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{c}</button>
                ))}
              </div>
            )}
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div key={message.id} initial={{ opacity: 0, x: message.type === 'user' ? 20 : -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md p-4 rounded-xl ${message.type === 'user' ? 'bg-blue-100 ml-12' : 'bg-gray-100 mr-12'} ${message.isError ? 'bg-red-50 border border-red-100' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {message.type === 'ai' && <span className="text-blue-600 text-lg">🦊</span>}
                      <span className="text-sm font-medium">{message.type === 'user' ? 'You' : 'Kei'}</span>
                    </div>
                    <div className={`whitespace-pre-wrap ${message.isError ? 'text-red-600' : 'text-gray-700'}`}>
                      {message.content.split(/(\*\*.*?\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**') ? (<strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>) : (<span key={index}>{part}</span>))}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </AnimatePresence>
            {isLoading && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-gray-500 p-4"><Loader2 className="w-5 h-5 animate-spin" /><span>{generateThinkingMessage()}</span></motion.div>)}
          </div>
          <div className="border-t p-4 bg-gray-50">
            <div className="flex gap-2 mb-4">
              <textarea value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} placeholder="Type your message to Kei..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none h-12 overflow-hidden"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
              <motion.button onClick={handleSendMessage} className="p-3 bg-blue-500 rounded-lg text-white shadow-md hover:bg-blue-600 transition-colors" whileTap={{ scale: 0.95 }}><Send className="w-5 h-5" /></motion.button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => getAIAnalysis('domainValidation')} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border transition-all" disabled={isLoading}><Wand2 className="w-4 h-4" />Domain Analysis</button>
              <button onClick={() => getAIAnalysis('outreachStrategy')} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border transition-all" disabled={isLoading}><Rocket className="w-4 h-4" />Outreach Plan</button>
              <button onClick={() => getAIAnalysis('techStackPrediction')} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 border transition-all" disabled={isLoading}><ClipboardList className="w-4 h-4" />Tech Stack</button>
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
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
```
