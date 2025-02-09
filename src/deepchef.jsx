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