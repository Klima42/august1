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