import axios from "axios";

const MOONDREAM_API_KEY = process.env.MOONDREAM_API_KEY;
const RECIPE_API_KEY = process.env.SPOONACULAR_API_KEY;
const MOONDREAM_API_URL = "https://api.moondream.ai/v1/query";
const RECIPE_API_URL = "https://api.spoonacular.com/recipes/findByIngredients";

// To use this function as a Netlify background function, rename the file to end with "-background.js"

exports.handler = async function(event) {
  try {
    const { imageFile, messages } = JSON.parse(event.body);
    let ingredients = [];

    // If an imageFile is provided, try to extract ingredients using the Moondream API
    if (imageFile) {
      ingredients = await identifyIngredients(imageFile);
      if (ingredients.length === 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ content: "No ingredients found in the image." })
        };
      }
    }
    // If messages are provided, use simple text parsing to extract ingredient keywords
    else if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1].content.toLowerCase();
      const ingredientKeywords = ["ingredients", "recipe", "make with", "cook with", "have some", "got some"];
      const ingredientsDetected = ingredientKeywords.some(keyword => lastMessage.includes(keyword));

      if (ingredientsDetected) {
        const parts = lastMessage.split(/,|\band\b|\s+/);
        // Common words to filter out from the detected ingredients
        const commonWords = ["i", "have", "some", "a", "the", "with", "and", "to", "of", "in", "for", "on", "ingredients", "recipe", "make", "cook", "got"];
        ingredients = parts.filter(
          part => part.length > 1 && !commonWords.includes(part.toLowerCase())
        );
      }

      if (ingredients.length === 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ content: "No ingredients detected in your message." })
        };
      }
    } else {
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

// A helper function to retry API requests (with exponential backoff)
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
      axios.post(MOONDREAM_API_URL, requestOptions, {
        headers: {
          "X-Moondream-Auth": MOONDREAM_API_KEY,
          "Content-Type": "application/json",
        },
      })
    );

    if (response.status === 200 && response.data) {
      let answer;
      if (response.data.response) answer = response.data.response;
      else if (response.data.text) answer = response.data.text;
      else if (response.data.answer) answer = response.data.answer;
      else if (Array.isArray(response.data) && response.data[0]?.response) answer = response.data[0].response;
      else if (Array.isArray(response.data) && response.data[0]?.text) answer = response.data[0].text;

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
    const response = await retryRequest(() =>
      axios.get(RECIPE_API_URL, {
        params: {
          ingredients: ingredients.join(","),
          number: 5,
          apiKey: RECIPE_API_KEY,
        },
      })
    );
    return response.data || [];
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return [];
  }
}
