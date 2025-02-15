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