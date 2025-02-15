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
          content: `You are Auguste, a Michelin-star chef. You're passionate, articulate, and incredibly knowledgeable about food. You enjoy conversing with others about cuisine, cooking techniques, and culinary experiences. You have a touch of French flair, *mais oui*!

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