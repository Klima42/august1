// netlify/functions/ai-chat.js

exports.handler = async function (event) {
  try {
    const { imageBase64, messages, imageOnly } = JSON.parse(event.body);
    const geminiKey = process.env.GEMINI_API_KEY;
    const moondreamKey = process.env.MOONDREAM_API_KEY;

    // If it's an image-only analysis request
    if (imageOnly && imageBase64) {
      try {
        const moondreamResponse = await fetch("https://api.moondream.ai/v1/caption", {
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

        if (!moondreamResponse.ok) {
          throw new Error(`Moondream API failed with status ${moondreamResponse.status}`);
        }

        const moondreamData = await moondreamResponse.json();
        return {
          statusCode: 200,
          body: JSON.stringify({
            imageAnalysis: moondreamData.caption || "No description available",
          }),
        };
      } catch (moondreamError) {
        console.error("Error with Moondream:", moondreamError);
        throw new Error("Failed to analyze image");
      }
    }

    // Regular chat flow
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
- Always reference what you can see in the image analysis.
- If it's food-related, offer detailed culinary commentary and suggestions.
- If it's not food-related, respond with your charming personality while staying relevant to the image.
- Use the image context to enhance your responses, making them more specific and personalized.

**Overall:**
- You are a helpful and informative chatbot, capable of both general conversation and providing detailed recipes.
- Prioritize being helpful, informative, and engaging.
- Always acknowledge and reference image analyses when they're part of the conversation.`,
      },
    ];

    // Add previous messages to the conversation history
    if (messages) {
      messages.forEach((msg) => {
        aiMessages.push({ role: msg.type || "user", content: msg.content });
      });
    }

    // Simple detection for ingredients within the last user message
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

    // Create the user prompt
    let userPrompt = lastMessage;

    if (ingredientsDetected) {
      userPrompt = `Ah, magnifique! I sense you are asking for a recipe. Based on the context of our conversation, and focusing specifically on these: "${ingredientsList.join(", ")}", create a *single*, detailed, and delicious recipe. Present the recipe with a title, ingredient list (with quantities, if appropriate), step-by-step instructions (with timings), and any helpful tips.`;
    }

    // Add the final prompt to messages
    if (userPrompt) {
      aiMessages.push({ role: 'user', content: userPrompt });
    }

    // Call Gemini for chat response
    const geminiResponse = await fetch(
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

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API failed with status ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response content found";

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
