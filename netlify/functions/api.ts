import axios from "axios";

const MOONDREAM_API_KEY = import.meta.env.VITE_MOONDREAM_API_KEY;
const RECIPE_API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;
const MOONDREAM_API_URL = "https://api.moondream.ai/v1/query";
const RECIPE_API_URL = "https://api.spoonacular.com/recipes/findByIngredients";

/**
 * Processes the user request.
 * If an image file is provided, uses Moondream to extract ingredients.
 * Otherwise, checks the messages for ingredient keywords and extracts ingredients from text.
 * Then, calls Spoonacular to fetch a recipe.
 */
export async function processUserRequest(params: {
  imageFile?: File;
  messages?: { type: string; content: string }[];
}): Promise<any> {
  try {
    // ----- IMAGE-BASED FLOW -----
    if (params.imageFile) {
      // Convert the image to Base64 and identify ingredients
      const ingredients = await identifyIngredients(params.imageFile);
      if (ingredients.length === 0) {
        return { content: "No ingredients found in the image." };
      }
      const recipes = await fetchRecipes(ingredients);
      if (recipes.length === 0) {
        return { content: "No recipes found from the identified ingredients." };
      }
      return { ingredients, recipes };
    }
    
    // ----- TEXT-BASED FLOW -----
    else if (params.messages && params.messages.length > 0) {
      const lastMessage = params.messages[params.messages.length - 1].content.toLowerCase();
      // Look for keywords that would indicate the user is asking for a recipe.
      const ingredientKeywords = ["ingredients", "recipe", "make with", "cook with", "have some", "got some"];
      const ingredientsDetected = ingredientKeywords.some(keyword => lastMessage.includes(keyword));
      
      let ingredientsList: string[] = [];
      if (ingredientsDetected) {
        // Split on commas, the word "and", or whitespace and filter out common words.
        const parts = lastMessage.split(/,|\band\b|\s+/);
        const commonWords = [
          "i", "have", "some", "a", "the", "with", "and", "to", "of", "in",
          "for", "on", "ingredients", "recipe", "make", "cook", "got"
        ];
        ingredientsList = parts.filter(
          part => part.length > 1 && !commonWords.includes(part.toLowerCase())
        );
      }
      
      if (ingredientsList.length === 0) {
        return { content: "No ingredients detected in your message." };
      }
      
      const recipes = await fetchRecipes(ingredientsList);
      if (recipes.length === 0) {
        return { content: "No recipes found based on your ingredients." };
      }
      
      return { ingredients: ingredientsList, recipes };
    }
    
    // ----- NO VALID INPUT -----
    else {
      return { content: "No valid input provided. Please supply an image file or a message." };
    }
  } catch (error: any) {
    console.error("Error processing user request:", error);
    return { error: "Failed to process request: " + error.message };
  }
}

/**
 * Given an image file, converts it to Base64 and calls the Moondream API
 * to extract a comma‐separated list of ingredients.
 */
export async function identifyIngredients(imageFile: File): Promise<string[]> {
  if (!MOONDREAM_API_KEY) {
    throw new Error("⚠️ Moondream API Key is missing. Check your .env file.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64Image = reader.result?.toString();
      if (!base64Image) {
        reject(new Error("⚠️ Error converting image to Base64."));
        return;
      }
      
      try {
        const response = await axios.post(
          MOONDREAM_API_URL,
          {
            image_url: base64Image,
            question: "Ingredients in this image separated by commas",
            stream: false,
          },
          {
            headers: {
              "X-Moondream-Auth": MOONDREAM_API_KEY,
              "Content-Type": "application/json",
            },
          }
        );
        
        // Check for a successful response.
        if (response.status === 200 && response.data) {
          let answer: string | undefined;
          // Try common fields to locate the answer.
          if (response.data.response) {
            answer = response.data.response;
          } else if (response.data.text) {
            answer = response.data.text;
          } else if (response.data.answer) {
            answer = response.data.answer;
          } else if (Array.isArray(response.data) && response.data[0]?.response) {
            answer = response.data[0].response;
          } else if (Array.isArray(response.data) && response.data[0]?.text) {
            answer = response.data[0].text;
          }
          
          if (answer && answer.trim() !== "") {
            const ingredients = answer.split(",").map((i: string) => i.trim()).filter(Boolean);
            resolve(ingredients);
          } else {
            // No answer found or only empty string returned.
            resolve([]);
          }
        } else {
          reject(new Error("⚠️ Unexpected response from Moondream API."));
        }
      } catch (error: any) {
        // Detailed error handling mimicking the original logic.
        if (axios.isAxiosError(error)) {
          if (error.response) {
            const status = error.response.status;
            if (status === 401) {
              reject(new Error("⚠️ Unauthorized. Check your Moondream API key."));
            } else if (status === 429) {
              reject(new Error("⚠️ Too many requests. Try again later."));
            } else if (status === 503) {
              reject(new Error("⚠️ Moondream API is temporarily unavailable. Try again later."));
            } else {
              reject(new Error(`⚠️ Moondream API Error: ${status} - ${error.response.statusText}`));
            }
          } else if (error.request) {
            reject(new Error("⚠️ Moondream API did not respond. Check your network connection."));
          } else {
            reject(new Error("⚠️ An error occurred setting up the request."));
          }
        } else {
          reject(new Error("⚠️ An unexpected error occurred."));
        }
      }
    };

    reader.onerror = () => reject(new Error("⚠️ Error reading image file."));
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Given a list of ingredients, uses the Spoonacular API to fetch recipes.
 */
export async function fetchRecipes(ingredients: string[]): Promise<any[]> {
  if (!RECIPE_API_KEY) {
    throw new Error("⚠️ Spoonacular API Key is missing. Check your .env file.");
  }

  try {
    const response = await axios.get(RECIPE_API_URL, {
      params: {
        ingredients: ingredients.join(","),
        number: 5,
        apiKey: RECIPE_API_KEY,
      },
    });
    return response.data || [];
  } catch (error: any) {
    console.error("Error fetching recipes:", error);
    return [];
  }
}
