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