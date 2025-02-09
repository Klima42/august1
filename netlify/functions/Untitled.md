# Project Export

## Project Statistics

- Total files: 12

## Folder Structure

```
.gitignore
README.md
index.html
netlify
  functions
    ai-chat.js
    moondream-analysis.js
    process-request.js
netlify.toml
package.json
src
  AIChatAssistant.jsx
  deepchef.jsx
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

    // Call the Gemini text API
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

### netlify/functions/moondream-analysis.js

```js
exports.handler = async function (event) {
    try {
      const { imageBase64 } = JSON.parse(event.body);
      if (!imageBase64) {
        throw new Error("Image data is required");
      }
      const moondreamKey = process.env.MOONDREAM_API_KEY;
  
      // Note: This endpoint only supports POST requests with a JSON payload.
      const response = await fetch("https://api.moondream.ai/v1/caption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Moondream-Auth": moondreamKey,
        },
        body: JSON.stringify({
          image_url: `data:image/jpeg;base64,${imageBase64}`,
          stream: false,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Moondream API failed with status ${response.status}`);
      }
  
      const moondreamData = await response.json();
      return {
        statusCode: 200,
        body: JSON.stringify({
          caption: moondreamData.caption || "No caption available",
        }),
      };
    } catch (error) {
      console.error("Error processing Moondream analysis request:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to process Moondream analysis request",
          details: error.message,
        }),
      };
    }
  };
  
```

### netlify/functions/process-request.js

```js
// netlify/functions/process-request.js
const MOONDREAM_API_KEY = process.env.MOONDREAM_API_KEY;
const RECIPE_API_KEY = process.env.SPOONACULAR_API_KEY;
const MOONDREAM_API_URL = "https://api.moondream.ai/v1/query";
const RECIPE_API_URL = "https://api.spoonacular.com/recipes/findByIngredients";

// To convert this to a background function (with longer timeout), 
// rename the file to include "-background.js"

exports.handler = async function(event) {
  try {
    const { imageFile, messages } = JSON.parse(event.body);
    let ingredients = [];

    // Image-based flow: Extract ingredients from an image
    if (imageFile) {
      ingredients = await identifyIngredients(imageFile);
      if (ingredients.length === 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ content: "No ingredients found in the image." })
        };
      }
    }
    // Text-based flow: Extract ingredients via simple text parsing
    else if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1].content.toLowerCase();
      const ingredientKeywords = ["ingredients", "recipe", "make with", "cook with", "have some", "got some"];
      const ingredientsDetected = ingredientKeywords.some(keyword => lastMessage.includes(keyword));

      if (ingredientsDetected) {
        const parts = lastMessage.split(/,|\band\b|\s+/);
        const commonWords = [
          "i", "have", "some", "a", "the", "with", "and", "to", "of", "in",
          "for", "on", "ingredients", "recipe", "make", "cook", "got"
        ];
        ingredients = parts.filter(part => part.length > 1 && !commonWords.includes(part.toLowerCase()));
      }

      if (ingredients.length === 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ content: "No ingredients detected in your message." })
        };
      }
    }
    else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request: No imageFile or messages provided." })
      };
    }

    // Fetch recipes based on the detected ingredients
    const recipes = await fetchRecipes(ingredients);
    if (recipes.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ content: "No recipes found based on your ingredients." })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ ingredients, recipes })
    };

  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process request: " + error.message })
    };
  }
};

// Helper function to retry API requests with exponential backoff
async function retryRequest(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying request, attempts left: ${retries}`);
      await new Promise(res => setTimeout(res, delay));
      return retryRequest(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function identifyIngredients(imageBase64) {
  if (!MOONDREAM_API_KEY) {
    throw new Error("⚠️ Moondream API Key is missing");
  }

  const requestOptions = {
    image_url: `data:image/jpeg;base64,${imageBase64}`,
    question: "Ingredients in this image separated by commas",
    stream: false,
  };

  try {
    const response = await retryRequest(() =>
      fetch(MOONDREAM_API_URL, {
        method: "POST",
        headers: {
          "X-Moondream-Auth": MOONDREAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestOptions),
      })
    );

    if (response.ok) {
      const data = await response.json();
      let answer;
      if (data.response) answer = data.response;
      else if (data.text) answer = data.text;
      else if (data.answer) answer = data.answer;
      else if (Array.isArray(data) && data[0]?.response) answer = data[0].response;
      else if (Array.isArray(data) && data[0]?.text) answer = data[0].text;

      if (answer && answer.trim() !== "") {
        return answer.split(",").map(i => i.trim()).filter(Boolean);
      }
    }
    return [];
  } catch (error) {
    console.error("Error identifying ingredients:", error);
    throw error;
  }
}

async function fetchRecipes(ingredients) {
  if (!RECIPE_API_KEY) {
    throw new Error("⚠️ Spoonacular API Key is missing");
  }

  try {
    const url = new URL(RECIPE_API_URL);
    url.searchParams.set("ingredients", ingredients.join(","));
    url.searchParams.set("number", "5");
    url.searchParams.set("apiKey", RECIPE_API_KEY);

    const response = await retryRequest(() => fetch(url));
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return [];
  }
}

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
    "axios": "^1.7.9",
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

```

### src/deepchef.jsx

```jsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, X, Send, Utensils } from 'lucide-react';

const DeepChef = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processUserRequest = async (params) => {
    // If we have an image file, convert it to base64 first
    if (params.imageFile) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result.split(',')[1]; // Remove data URL prefix
            const response = await fetch('/.netlify/functions/process-request', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...params,
                imageFile: base64Data,
              }),
            });
            const data = await response.json();
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(params.imageFile);
      });
    } else {
      // Handle text-based requests
      const response = await fetch('/.netlify/functions/process-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      return await response.json();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const requestData = {};
      if (imageFile) {
        requestData.imageFile = imageFile;
      } else if (currentMessage) {
        requestData.messages = [{
          type: 'user',
          content: currentMessage
        }];
      }

      const response = await processUserRequest(requestData);

      if (response.error) {
        setError(response.error);
      } else {
        if (response.ingredients) {
          setIngredients(response.ingredients);
        }
        if (response.recipes) {
          setRecipes(response.recipes);
        }
        setCurrentMessage('');
        setImageFile(null);
        setImagePreview('');
      }
    } catch (err) {
      setError('Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setImageFile(null);
    setImagePreview('');
    setIngredients([]);
    setRecipes([]);
    setError('');
    setCurrentMessage('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="border rounded-xl bg-white shadow-lg mt-6"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-xl">🧑‍🍳</span>
          <h3 className="font-semibold">DeepChef</h3>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-1 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {isOpen && (
        <div className="h-96 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex flex-col gap-4">
              {/* Image Upload Section */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Camera className="w-4 h-4" />
                  Upload Food Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="relative w-full flex justify-center">
                  <img
                    src={imagePreview}
                    alt="Food Preview"
                    className="max-h-48 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setImagePreview('');
                      setImageFile(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Text Input */}
              <div className="flex gap-2">
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Or type your ingredients here..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none h-12 overflow-hidden"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <motion.button
                  onClick={handleSubmit}
                  disabled={loading || (!imageFile && !currentMessage)}
                  className="p-3 bg-blue-500 rounded-lg text-white shadow-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              </div>

              {/* Results Section */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-50 text-red-600 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}

                {ingredients.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <h4 className="font-semibold mb-2">Detected Ingredients:</h4>
                    <div className="flex flex-wrap gap-2">
                      {ingredients.map((ingredient, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {recipes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <h4 className="font-semibold">Suggested Recipes:</h4>
                    {recipes.map((recipe, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg flex items-center gap-4"
                      >
                        <Utensils className="w-6 h-6 text-blue-500" />
                        <div>
                          <h5 className="font-medium">{recipe.title}</h5>
                          {recipe.missedIngredientCount > 0 && (
                            <p className="text-sm text-gray-500">
                              Missing {recipe.missedIngredientCount} ingredients
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DeepChef;
```

### src/main.jsx

```jsx
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AIChatAssistant from './AIChatAssistant';
import DeepChef from './deepchef';

const App = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">Chef GPT</h1>
      
      {/* Main content container */}
      <div className="space-y-6">
        {/* Original AIChatAssistant */}
        <AIChatAssistant 
          company="ExampleCorp" 
          domain="example.com" 
          companies={["ExampleCorp", "AnotherCorp"]} 
        />
        
        {/* New DeepChef component */}
        <DeepChef />
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
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
