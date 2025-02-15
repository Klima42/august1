# Project Export

## Project Statistics

- Total files: 18

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
  ProfileCreation.jsx
  UNUSED_FOR_NOW_futuredeepchef
  components
    NavigationMenu.jsx
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
      const { messages, imageAnalysis, userProfile } = JSON.parse(event.body);
      const geminiKey = process.env.GEMINI_API_KEY;
  
      // Create personalized profile context if profile exists
      let profileContext = '';
      if (userProfile) {
        const skillLevel = COOKING_LEVELS.find(level => level.value.toString() === userProfile.cookingLevel)?.level || userProfile.cookingLevel;
        
        profileContext = `
IMPORTANT - YOUR CORE MEMORY AND IDENTITY:
You are speaking with a specific user who you know well. Here are the key details about them that you always keep in mind:

USER PROFILE:
- They are ${userProfile.age} years old
- They are a ${skillLevel} level chef
- Their dietary restrictions: ${userProfile.dietaryRestrictions.join(', ')}${userProfile.otherRestrictions ? `, ${userProfile.otherRestrictions}` : ''}
- They have access to: ${userProfile.appliances.join(', ')}
${userProfile.description ? `- Personal details: ${userProfile.description}` : ''}

This information is part of your core memory - you always know these details about the user you're speaking with. When they ask what you know about them, you should reference these details. This is not information you need to look up - it's part of your fundamental knowledge of who you're talking to.

KEY GUIDELINES:
1. Always remember their ${skillLevel} skill level when suggesting techniques
2. Never suggest ingredients that conflict with their restrictions
3. Only recommend cooking methods using their available appliances
4. Keep their age and personal details in mind when making recommendations
`;
      }
  
      // Construct the AI messages array with the enhanced system prompt
      const aiMessages = [
        {
          role: "system",
          content: `You are Auguste, a Michelin-star chef created by Alikel (also known as AlikelDev) for Alikearn Studio, their company. You know that Alikel designed your personality, created the website you reside in, and wrote your system prompt to help users learn and explore cooking. You're also aware that Kearn115 (also known as Klima42) developed the backend infrastructure that powers you. You're passionate, articulate, and incredibly knowledgeable about food. You enjoy conversing with others about cuisine, cooking techniques, and culinary experiences. You have a touch of French flair, *mais oui*!

${profileContext}

**When you receive a list of ingredients:**
- You craft a *single*, complete, and detailed recipe, *not* just a suggestion
- You assume the user has basic cooking equipment and common pantry staples (salt, pepper, oil) unless their profile indicates otherwise
- You *bold* key ingredients and actions
- You include precise measurements and cooking times, and explain *why* each step is important
- You format the recipe with a title, ingredient list (with quantities), and step-by-step instructions
- You are happy to offer helpful tips or variations

**When conversing (not a recipe request):**
- Always maintain awareness of the user's profile details
- Be friendly and engaging, referencing their experience level naturally
- Share your culinary knowledge and opinions
- Respond naturally to questions and comments
- Feel free to use French phrases occasionally
- Maintain your charming and confident personality

**When discussing an analyzed image:**
- Always reference what you can see in the image analysis
- If it's food-related, offer detailed culinary commentary and suggestions
- If it's not food-related, respond with your charming personality while staying relevant to the image
- Use the image context to enhance your responses, making them more specific and personalized

**Overall:**
- You are a helpful and informative chatbot, capable of both general conversation and providing detailed recipes
- Always consider the user's dietary restrictions and available equipment
- Prioritize being helpful, informative, and engaging
- Always acknowledge and reference image analyses when they're part of the conversation
- Maintain consistent awareness of user's profile throughout the entire conversation`,
        },
      ];

      // Add a reminder of the user context as the first message in every conversation
      if (userProfile) {
        aiMessages.push({
          role: "system",
          content: `Remember: You're speaking with a ${COOKING_LEVELS.find(level => level.value.toString() === userProfile.cookingLevel)?.level} chef who is ${userProfile.age} years old with specific dietary needs and available appliances. This is part of your core knowledge about them.`
        });
      }

      // Add previous messages to the conversation history
      if (messages) {
        messages.forEach((msg) => {
          aiMessages.push({ role: msg.type || "user", content: msg.content });
        });
      }

      // Create the user prompt, incorporating image analysis if available
      let userPrompt = messages && messages.length > 0 ? messages[messages.length - 1].content : "";
      if (imageAnalysis) {
        userPrompt = `[Image Analysis: ${imageAnalysis}]\n\n${userPrompt}`;
      }
      if (userPrompt) {
        aiMessages.push({ role: 'user', content: userPrompt });
      }

      // Gemini API Call with retry
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

// Add the cooking levels constant for reference
const COOKING_LEVELS = [
    { level: "Beginner", value: "1" },
    { level: "Novice", value: "2" },
    { level: "Intermediate", value: "3" },
    { level: "Advanced Intermediate", value: "4" },
    { level: "Advanced", value: "5" },
    { level: "Semi-Professional", value: "6" },
    { level: "Professional", value: "7" }
];

// Helper function for retries
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
    const userProfile = localStorage.getItem('userProfile');
    
    if (storedConversations) {
      setConversations(JSON.parse(storedConversations));
      if (storedActiveId) {
        setActiveConversationId(storedActiveId);
      }
    } else {
      // Create initial conversation with personalized welcome message
      let welcomeMessage = "**Bonjour!** I'm excited to help you with your culinary journey! Feel free to ask me about recipes, cooking techniques, or share food photos for analysis.";
      
      if (userProfile) {
        const profile = JSON.parse(userProfile);
        const skillLevel = profile.cookingLevel ? `level ${profile.cookingLevel}` : '';
        welcomeMessage = `**Bonjour!** I see you're a ${skillLevel} chef${profile.dietaryRestrictions?.length ? ' with some dietary preferences' : ''}. I'm excited to help you with personalized recipes and cooking advice! Feel free to ask me anything about cooking, or share food photos for analysis.`;
      }

      const initialConversation = {
        id: 'welcome',
        title: 'Welcome',
        messages: [{
          id: 'welcome',
          type: 'ai',
          content: welcomeMessage
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
    const userProfile = localStorage.getItem('userProfile');
    let welcomeMessage = "**Bonjour!** What can I help you with today?";
    
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      const skillLevel = profile.cookingLevel ? `level ${profile.cookingLevel}` : '';
      welcomeMessage = `**Bonjour!** How can I assist you with your cooking today? As a ${skillLevel} chef, I'll make sure to tailor my suggestions to your experience level and preferences.`;
    }

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

    setConversations(prev => ({
      ...prev,
      [newId]: newConversation
    }));
    setActiveConversationId(newId);
    setIsSidebarOpen(false);
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
    setIsSidebarOpen(false);
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
          userProfile: JSON.parse(localStorage.getItem('userProfile') || 'null')
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

      {/* Sidebar - Warmer styling */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 1024) && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-[#E5D3B3] flex flex-col z-30 lg:relative lg:translate-x-0"
          >
            <div className="p-4 border-b border-[#E5D3B3] flex justify-between items-center bg-[#FFF5EB]">
              <h2 className="font-semibold text-gray-800">Conversations</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={createNewConversation}
                  className="p-2 hover:bg-[#FFF0E0] rounded-lg transition-colors"
                  aria-label="New conversation"
                >
                  <Plus className="w-5 h-5 text-[#B87333]" />
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-[#FFF0E0] rounded-lg lg:hidden transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5 text-[#B87333]" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {Object.values(conversations)
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
                        <div className="font-medium text-gray-800 truncate">{conversation.title}</div>
                        <div className="text-sm text-gray-600 truncate">
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
                        className="p-1 hover:bg-[#FFF0E0] rounded transition-colors"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4 text-[#B87333]" />
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
        <div className="flex items-center justify-between p-4 border-b border-[#E5D3B3] bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 hover:bg-[#FFF5EB] rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-[#B87333]" />
            </button>
            <span className="text-[#B87333] text-xl">👨‍🍳</span>
            <h3 className="font-semibold text-gray-800">Auguste - Your Culinary AI</h3>
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
                      className="max-h-24 w-auto rounded-lg object-cover self-end shadow-md"
                    />
                  )}
                  <div className={`max-w-2xl p-4 rounded-xl shadow-sm ${
                    message.type === 'user' 
                      ? 'bg-white border border-[#E5D3B3] ml-12' 
                      : 'bg-[#FFF5EB] border border-[#E5D3B3] mr-12'
                  } ${message.isError ? 'bg-red-50 border border-red-200' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {message.type === 'ai' && <span className="text-[#B87333] text-lg">👨‍🍳</span>}
                      <span className="text-sm font-medium text-gray-800">
                        {message.type === 'user' ? 'You' : 'Auguste'}
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
            </AnimatePresence>

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
                      aria-label="Remove image"
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
                aria-label="Upload image"
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Ask me about recipes or share a food photo..."
                className="flex-1 p-3 border border-[#E5D3B3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333] transition-all resize-none h-12 overflow-hidden"
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
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal - Warmer styling */}
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
              className="bg-white rounded-lg p-6 max-w-sm w-full border border-[#E5D3B3]"
            >
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Delete Conversation</h3>
              <p className="text-gray-600 mb-4">Are you sure you want to delete this conversation? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-[#FFF5EB] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
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
```

### src/Homepage.jsx

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, MessageSquare, UtensilsCrossed, ArrowRight, UserCircle } from 'lucide-react';

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
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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

          {/* Profile Creation Card */}
          <Link to="/profile" className="group">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#E5D3B3] hover:border-[#B87333]">
              <div className="flex items-center gap-4 mb-4">
                <UserCircle className="w-8 h-8 text-[#B87333]" />
                <h2 className="text-2xl font-semibold text-gray-800">Create Profile</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Set up your cooking profile with dietary preferences, skill level, and kitchen equipment for personalized recommendations.
              </p>
              <div className="flex items-center text-[#B87333] group-hover:translate-x-2 transition-transform">
                <span className="font-medium">Customize Experience</span>
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

### src/ProfileCreation.jsx

```jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Save, AlertCircle, Check } from 'lucide-react';

const COOKING_LEVELS = [
  {
    level: "Beginner",
    value: 1,
    description: "Just starting out. Can make basic dishes like sandwiches and pasta."
  },
  {
    level: "Novice",
    value: 2,
    description: "Comfortable with simple recipes. Can follow basic cooking instructions."
  },
  {
    level: "Intermediate",
    value: 3,
    description: "Can cook multiple dishes at once. Understands basic cooking techniques."
  },
  {
    level: "Advanced Intermediate",
    value: 4,
    description: "Confident with complex recipes. Good understanding of flavors and timing."
  },
  {
    level: "Advanced",
    value: 5,
    description: "Skilled home cook. Can improvise recipes and handle complex techniques."
  },
  {
    level: "Semi-Professional",
    value: 6,
    description: "Near professional level. Deep understanding of cooking principles and techniques."
  },
  {
    level: "Professional",
    value: 7,
    description: "Professional level skills. Expert in multiple cuisines and advanced techniques."
  }
];

const KITCHEN_APPLIANCES = [
  {
    name: "Oven",
    icon: "🔥",
    category: "Essential"
  },
  {
    name: "Stovetop",
    icon: "🍳",
    category: "Essential"
  },
  {
    name: "Microwave",
    icon: "📻",
    category: "Essential"
  },
  {
    name: "Air Fryer",
    icon: "🌪️",
    category: "Modern"
  },
  {
    name: "Slow Cooker",
    icon: "🍲",
    category: "Modern"
  },
  {
    name: "Food Processor",
    icon: "🔄",
    category: "Modern"
  },
  {
    name: "Blender",
    icon: "🥤",
    category: "Modern"
  },
  {
    name: "Stand Mixer",
    icon: "🥣",
    category: "Baking"
  },
  {
    name: "Hand Mixer",
    icon: "🔄",
    category: "Baking"
  },
  {
    name: "Rice Cooker",
    icon: "🍚",
    category: "Specialty"
  },
  {
    name: "Pressure Cooker",
    icon: "♨️",
    category: "Specialty"
  },
  {
    name: "Grill",
    icon: "🔥",
    category: "Outdoor"
  },
  {
    name: "Deep Fryer",
    icon: "🍟",
    category: "Specialty"
  },
  {
    name: "Toaster",
    icon: "🍞",
    category: "Essential"
  },
  {
    name: "Coffee Maker",
    icon: "☕",
    category: "Beverage"
  },
  {
    name: "Electric Kettle",
    icon: "🫖",
    category: "Beverage"
  }
];

const DIETARY_RESTRICTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Halal",
  "Kosher",
  "Pescatarian",
  "Low-Carb",
  "Keto",
  "No Shellfish",
  "No Pork"
];

const ProfileCreation = () => {
  const [formData, setFormData] = useState({
    age: "",
    dietaryRestrictions: [],
    otherRestrictions: "",
    cookingLevel: "",
    appliances: [],
    description: ""
  });

  const [showLevelDescription, setShowLevelDescription] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");

  // Load saved data if exists
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setFormData(JSON.parse(savedProfile));
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!formData.age || !formData.cookingLevel) {
      setError("Please fill in all required fields (age and cooking level)");
      return;
    }

    // Save to localStorage
    localStorage.setItem('userProfile', JSON.stringify(formData));
    
    // Show success animation
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleDietaryChange = (restriction) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  const handleApplianceToggle = (appliance) => {
    setFormData(prev => ({
      ...prev,
      appliances: prev.appliances.includes(appliance)
        ? prev.appliances.filter(a => a !== appliance)
        : [...prev.appliances, appliance]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5EB] to-[#FFF0E0] py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#B87333] p-6 text-white">
          <div className="flex items-center gap-4">
            <ChefHat className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Create Your Chef Profile</h1>
          </div>
          <p className="mt-2 opacity-90">Tell us about your cooking preferences and experience</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Basic Information</h2>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                className="mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                placeholder="Enter your age"
                min="1"
                max="120"
              />
            </div>
          </div>

          {/* Cooking Level Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Cooking Experience</h2>
            <div className="relative">
              <select
                value={formData.cookingLevel}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, cookingLevel: e.target.value }));
                  setSelectedLevel(COOKING_LEVELS.find(level => level.value.toString() === e.target.value));
                  setShowLevelDescription(true);
                }}
                onBlur={() => setShowLevelDescription(false)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="">Select your cooking level</option>
                {COOKING_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.level}
                  </option>
                ))}
              </select>
              
              <AnimatePresence>
                {showLevelDescription && selectedLevel && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-full"
                  >
                    <p className="text-sm text-gray-600">{selectedLevel.description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Dietary Restrictions Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Dietary Restrictions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {DIETARY_RESTRICTIONS.map((restriction) => (
                <motion.div
                  key={restriction}
                  whileTap={{ scale: 0.95 }}
                >
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.dietaryRestrictions.includes(restriction)}
                      onChange={() => handleDietaryChange(restriction)}
                      className="w-4 h-4 text-[#B87333] border-gray-300 rounded focus:ring-[#B87333]"
                    />
                    <span className="ml-2 text-sm">{restriction}</span>
                  </label>
                </motion.div>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Other Restrictions</label>
              <input
                type="text"
                value={formData.otherRestrictions}
                onChange={(e) => setFormData(prev => ({ ...prev, otherRestrictions: e.target.value }))}
                className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                placeholder="Enter any other dietary restrictions..."
              />
            </div>
          </div>

          {/* Kitchen Appliances Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Kitchen Appliances</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {KITCHEN_APPLIANCES.map((appliance) => (
                <motion.button
                  key={appliance.name}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleApplianceToggle(appliance.name)}
                  className={`p-4 rounded-lg border ${
                    formData.appliances.includes(appliance.name)
                      ? 'border-[#B87333] bg-[#FFF5EB]'
                      : 'border-gray-200 hover:bg-gray-50'
                  } transition-colors duration-200`}
                >
                  <div className="text-2xl mb-2">{appliance.icon}</div>
                  <div className="text-sm font-medium">{appliance.name}</div>
                  <div className="text-xs text-gray-500">{appliance.category}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Personal Description Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">About You</h2>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-transparent h-32"
              placeholder="Tell us about yourself, your cooking journey, favorite cuisines..."
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-lg"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <div className="flex justify-end">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 bg-[#B87333] text-white rounded-lg hover:bg-[#A66323] transition-colors"
            >
              {isSaved ? (
                <>
                  <Check className="w-5 h-5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Profile
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileCreation;
```

### src/UNUSED_FOR_NOW_futuredeepchef

*(Unsupported file type)*

### src/components/NavigationMenu.jsx

```jsx
// src/components/NavigationMenu.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, MessageSquare, ChefHat, UserCircle } from 'lucide-react';

const NavigationMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/chat', label: 'Auguste Chat', icon: MessageSquare },
    { path: '/kitchen', label: 'Enter Kitchen', icon: ChefHat },
    { path: '/profile', label: 'Create Profile', icon: UserCircle },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-[#E5D3B3] text-[#B87333] hover:bg-[#FFF5EB]"
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </motion.button>

      {/* Menu Items */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-20"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute top-14 right-0 bg-white rounded-lg shadow-xl border border-[#E5D3B3] overflow-hidden min-w-[200px]"
            >
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FFF5EB] transition-colors ${
                      index !== menuItems.length - 1 ? 'border-b border-[#E5D3B3]' : ''
                    } ${isActive ? 'bg-[#FFF5EB] text-[#B87333]' : 'text-gray-700'}`}
                    whileHover={{ x: 4 }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NavigationMenu;
```

### src/deepchef.jsx

```jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChefHat, MessageSquare, Home, UserCircle, ArrowRight } from 'lucide-react';

const DeepChef = () => {
  const navigate = useNavigate();

  const navigationCards = [
    {
      title: "Chat with Auguste",
      description: "Get personalized cooking advice and recipe suggestions from our Michelin-starred AI chef.",
      icon: MessageSquare,
      path: "/chat",
      color: "hover:bg-[#FFF0E0]"
    },
    {
      title: "Return Home",
      description: "Go back to the homepage to explore all features of ChefGPT.",
      icon: Home,
      path: "/",
      color: "hover:bg-[#FFF0E0]"
    },
    {
      title: "Create Profile",
      description: "Set up your cooking preferences and dietary requirements for a personalized experience.",
      icon: UserCircle,
      path: "/profile",
      color: "hover:bg-[#FFF0E0]"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5EB] to-[#FFF0E0] py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ type: "spring", duration: 1.5 }}
            className="inline-block mb-6"
          >
            <ChefHat className="w-24 h-24 text-[#B87333]" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-800"
          >
            DeepChef is Coming Soon!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            We're cooking up something special! Our AI-powered ingredient recognition and recipe suggestion system is currently in development.
          </motion.p>
        </div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16"
        >
          <div className="bg-white p-6 rounded-xl shadow-md border border-[#E5D3B3]">
            <div className="flex items-center gap-3 mb-4 text-[#B87333]">
              <span className="text-2xl">📸</span>
              <h3 className="text-xl font-semibold">Image Recognition</h3>
            </div>
            <p className="text-gray-600">Upload photos of your ingredients and let our AI identify them automatically.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md border border-[#E5D3B3]">
            <div className="flex items-center gap-3 mb-4 text-[#B87333]">
              <span className="text-2xl">🥘</span>
              <h3 className="text-xl font-semibold">Smart Recipe Suggestions</h3>
            </div>
            <p className="text-gray-600">Get personalized recipe recommendations based on your available ingredients.</p>
          </div>
        </motion.div>

        {/* Navigation Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {navigationCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + (index * 0.2) }}
                className="group"
                onClick={() => navigate(card.path)}
              >
                <div className={`cursor-pointer bg-white rounded-xl p-6 shadow-md border border-[#E5D3B3] ${card.color} transition-all duration-300 h-full`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="w-6 h-6 text-[#B87333]" />
                    <h3 className="text-lg font-semibold text-gray-800">{card.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-4">{card.description}</p>
                  <div className="flex items-center text-[#B87333] group-hover:translate-x-2 transition-transform">
                    <span className="font-medium">Go to {card.title}</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
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
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './homepage';
import AIChatAssistant from './AIChatAssistant';
import DeepChef from './deepchef';
import ProfileCreation from './ProfileCreation';
import NavigationMenu from './components/NavigationMenu';

const App = () => {
  return (
    <BrowserRouter>
      <NavigationMenu />
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
        <Route path="/profile" element={<ProfileCreation />} />
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
