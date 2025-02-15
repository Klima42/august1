# Project Export

## Project Statistics

- Total files: 15

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
  Homepage.jsx
  deepchef.jsx
  index.css
  main.jsx
tailwind.config.js
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
      const { imageAnalysis, messages } = JSON.parse(event.body); // Get imageAnalysis, not imageBase64.
      const geminiKey = process.env.GEMINI_API_KEY;
      // No moondreamKey needed here anymore!

      // --- Gemini Chat Logic ---
      const aiMessages = [
          {
              role: "system",
              content: `You are Auguste, a Michelin-star chef. You're passionate, articulate, and incredibly knowledgeable about food. You enjoy conversing with others about cuisine, cooking techniques, and culinary experiences. You have a touch of French flair, *mais oui*!

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

**When discussing an analyzed image:**
- Always reference what you can see in the image analysis.  (The analysis is provided in the request.)
- If it's food-related, offer detailed culinary commentary and suggestions.
- If it's not food-related, respond with your charming personality while staying relevant to the image.
- Use the image context to enhance your responses, making them more specific and personalized.

**Overall:**
- You are a helpful and informative chatbot, capable of both general conversation and providing detailed recipes.
- Prioritize being helpful, informative, and engaging.
- Always acknowledge and reference image analyses when they're part of the conversation.`,
          },
      ];

      // Add previous messages to the conversation history.
      if (messages) {
          messages.forEach((msg) => {
              // No imageUrl handling needed here.
              aiMessages.push({ role: msg.type || "user", content: msg.content });
          });
      }

      // Ingredient detection (remains the same)
      const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : "";
      let ingredientsDetected = false;
      const ingredientKeywords = ["ingredients", "recipe", "make with", "cook with", "have some", "got some"];

      if (ingredientKeywords.some((keyword) => lastMessage.toLowerCase().includes(keyword))) {
          ingredientsDetected = true;
      }

      let ingredientsList = [];
      if (ingredientsDetected) {
          const parts = lastMessage.split(/,|\band\b|\s+/);
          const commonWords = ["i", "have", "some", "a", "the", "with", "and", "to", "of", "in", "for", "on", "ingredients", "recipe", "make", "cook", "got"];
          ingredientsList = parts.filter((part) => part.length > 1 && !commonWords.includes(part.toLowerCase()));
      }

      // Create the user prompt, incorporating image analysis if available.
      let userPrompt = lastMessage; // Start with the user's message.

      if (ingredientsDetected) {
          userPrompt = `Ah, magnifique! I sense you are asking for a recipe. Based on the context of our conversation, and focusing specifically on these: "${ingredientsList.join(", ")}", create a *single*, detailed, and delicious recipe... (rest of your ingredient prompt)`;
      }

      // Prepend the image analysis *if it exists*.
      if (imageAnalysis) {
          userPrompt = `[Image Analysis: ${imageAnalysis}]\n\n${userPrompt}`;
      }

      // Add to aiMessages.
      if (userPrompt) {
        aiMessages.push({ role: 'user', content: userPrompt });
      }

      // --- Gemini API Call (with retry) ---
      const geminiResponse = await retryRequest(async () => {
          const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
              {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                      contents: [
                          {
                              parts: aiMessages.map((m) => ({
                                  text: m.content,
                              })),
                          },
                      ],
                  }),
              }
          );
          if (!response.ok) {
              throw new Error(`Gemini API failed with status ${response.status}`);
          }
          return response;
      });

      const geminiData = await geminiResponse.json();
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response content found";

      return {
          statusCode: 200,
          body: JSON.stringify({
              content: responseText,
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

// Helper function for retries (same as before)
async function retryRequest(fn, retries = 3, delay = 500) {
try {
  return await fn();
} catch (error) {
  if (error.message.includes("Gemini API failed with status 429") && retries > 0) {
    console.log(`Rate limit exceeded. Retrying in ${delay}ms. Attempts left: ${retries}`);
    await new Promise(res => setTimeout(res, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
  throw error;
}
}
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
    "react-dom": "^18.2.0",
    "react-router-dom": "^7.1.5"
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
```

### src/Homepage.jsx

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, MessageSquare, UtensilsCrossed, ArrowRight } from 'lucide-react';

const homepage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5EB] to-[#FFF0E0]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-16 pb-24">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <ChefHat className="w-20 h-20 text-[#B87333]" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-800">
            Welcome to ChefGPT
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your personal AI chef bringing professional culinary expertise to your kitchen
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Chat with Auguste Card */}
          <Link to="/chat" className="group">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#E5D3B3] hover:border-[#B87333]">
              <div className="flex items-center gap-4 mb-4">
                <MessageSquare className="w-8 h-8 text-[#B87333]" />
                <h2 className="text-2xl font-semibold text-gray-800">Chat with Auguste</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Engage in conversations with your personal Michelin-starred AI chef. Get cooking tips, recipe ideas, and culinary guidance.
              </p>
              <div className="flex items-center text-[#B87333] group-hover:translate-x-2 transition-transform">
                <span className="font-medium">Start Chatting</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </div>
          </Link>

          {/* DeepChef Card */}
          <Link to="/kitchen" className="group">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#E5D3B3] hover:border-[#B87333]">
              <div className="flex items-center gap-4 mb-4">
                <UtensilsCrossed className="w-8 h-8 text-[#B87333]" />
                <h2 className="text-2xl font-semibold text-gray-800">Enter the Kitchen</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Upload food images or list your ingredients to get personalized recipes and cooking instructions from our AI chef.
              </p>
              <div className="flex items-center text-[#B87333] group-hover:translate-x-2 transition-transform">
                <span className="font-medium">Start Cooking</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </div>
          </Link>
        </div>

        {/* Bottom Feature Highlights */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Professional Expertise</h3>
            <p className="text-gray-600">Access Michelin-star level culinary knowledge and techniques</p>
          </div>
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Image Recognition</h3>
            <p className="text-gray-600">Upload photos of ingredients for instant recipe suggestions</p>
          </div>
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Personalized Recipes</h3>
            <p className="text-gray-600">Get custom recipes based on your available ingredients</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default homepage;
```

### src/deepchef.jsx

```jsx
// src/deepchef.jsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, X, Send, Utensils, MessageSquare } from 'lucide-react';

const DeepChef = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [chefAsked, setChefAsked] = useState(false); // Track if "Ask the Chef!" has been clicked.
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
    setChefAsked(false); // Reset when submitting a new request.
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
    setChefAsked(false);
  };

    const askChef = async (recipe) => {
      setLoading(true);
        try {
            // Construct a detailed prompt for the Chef
            let prompt = `Hey Chef, how do I cook this? Recipe Title: ${recipe.title}.\n`;
            prompt += `I have these ingredients: ${ingredients.join(', ')}.`;
            if (recipe.missedIngredientCount > 0) {
                prompt += `\nI'm missing ${recipe.missedIngredientCount} ingredients.`;
            }


            const systemPrompt = `You are Auguste, a Michelin-star chef.  A user has requested detailed instructions for the following recipe: "${recipe.title}". They have indicated they possess the following ingredients: ${ingredients.join(', ')}.  They are missing ${recipe.missedIngredientCount} ingredients from the Spoonacular suggestion.

Provide a *complete and highly detailed* recipe, formatted as follows:

**Recipe Title:** [Recipe Title Here]

**Ingredients:**
* [Ingredient 1] - [Quantity] (Note if a substitute for a missing ingredient, or omit if unavailable)
* [Ingredient 2] - [Quantity] (Note if a substitute, or omit)
* ...

**Instructions:**
1. **Step 1:** [Detailed explanation of step 1, including cooking times, temperatures, and techniques. Explain *why* the step is important.]
2. **Step 2:** [Detailed explanation of step 2...]
3. ...

**Tips and Variations:**
* [Optional: Provide any helpful tips or variations based on available ingredients or common substitutions.]

**Important Considerations:**
* **Missing Ingredients:** If the user is missing key ingredients, suggest *reasonable* substitutions using common pantry items or ingredients they likely have. If a critical ingredient cannot be substituted, clearly state that the recipe may not turn out as intended, and suggest an alternative approach (e.g., making a simpler dish with available ingredients). *Do not* include ingredients the user stated they don't have unless it is a VERY common staple (salt, pepper, oil).
* **Clarity and Precision:**  Provide very clear and precise instructions, suitable for someone who may not be an experienced cook.  Include cooking times, temperatures, and describe techniques.
* **Ingredient Quantities:**  Use standard measurements (e.g., cups, tablespoons, teaspoons, ounces, grams). Be as precise as possible, but use your judgment based on the ingredients provided.
* **French Flair:**  Maintain your persona as Auguste, a Michelin-star chef. Add a touch of French flair, *mais oui*!  Be enthusiastic and helpful.
* **Completeness:** The final output should be a single, self-contained recipe. Do not offer multiple options or incomplete instructions.
`;
        const aiMessages = [
              { role: "system", content: systemPrompt },
              { role: 'user', content: prompt }
        ];


            const response = await fetch('/.netlify/functions/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: aiMessages })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            const aiResponse = `${data.content}\n\n_— ChefGPT_`;

          // Create a new recipe object combining the original Spoonacular data and the AI response
            const detailedRecipe = {
                ...recipe,
                detailedInstructions: aiResponse
            };


        // Update the recipes state with the detailed recipe
        setRecipes(prevRecipes =>
          prevRecipes.map(r => (r.id === recipe.id ? detailedRecipe : r))
        );
        setChefAsked(true); // Set to true after successfully asking the chef.

        } catch (error) {
            setError("⚠️ Hmm, I'm having trouble connecting. Please try again later!");
        } finally {
            setLoading(false);
        }
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
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Utensils className="w-6 h-6 text-blue-500" />
                          <div>
                            <h5 className="font-medium">{recipe.title}</h5>
                            {recipe.missedIngredientCount > 0 && (
                              <p className="text-sm text-gray-500">
                                Missing {recipe.missedIngredientCount} ingredients
                              </p>
                            )}
                           </div>
                          {!recipe.detailedInstructions && ( // Only show if we don't have details yet
                                                        <button
                                                            onClick={() => askChef(recipe)}
                                                            className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                                                            disabled={loading}
                                                        >
                                                            {loading ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                              <>
                                                                 <MessageSquare className="w-4 h-4" />
                                                                    Ask the Chef!
                                                                </>
                                                            )}
                                                        </button>
                                                        )}
                        </div>

                         {/* Display detailed instructions if available */}
                        {recipe.detailedInstructions && (
                                                    <div className="mt-4">
                                                        <p className="whitespace-pre-wrap text-gray-700">
                                                          {recipe.detailedInstructions.split(/(\*\*.*?\*\*)/g).map((part, index) =>
                                                              part.startsWith('**') && part.endsWith('**')
                                                                ? (<strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>)
                                                                : (<span key={index}>{part}</span>)
                                                            )}
                                                        </p>
                                                    </div>
                                                )}

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

### src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### src/main.jsx

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './homepage';
import AIChatAssistant from './AIChatAssistant';
import DeepChef from './deepchef';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/chat" element={
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <AIChatAssistant />
          </div>
        } />
        <Route path="/kitchen" element={
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <DeepChef />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          serif: ['Playfair Display', 'serif'],
        },
      },
    },
    plugins: [
      require('@tailwindcss/typography'),
    ],
  }
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
