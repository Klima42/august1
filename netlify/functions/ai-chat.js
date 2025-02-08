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