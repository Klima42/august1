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