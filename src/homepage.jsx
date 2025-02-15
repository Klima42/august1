import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, MessageSquare, UtensilsCrossed, ArrowRight, UserCircle } from 'lucide-react';

const homepage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5EB] to-[#FFF0E0]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-16 pb-24">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <ChefHat className="w-20 h-20 text-[#B87333]" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-800">
            Welcome to ChefGPT
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your personal AI chef bringing professional culinary expertise to your kitchen
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Chat with Auguste Card */}
          <Link to="/chat" className="group">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#E5D3B3] hover:border-[#B87333]">
              <div className="flex items-center gap-4 mb-4">
                <MessageSquare className="w-8 h-8 text-[#B87333]" />
                <h2 className="text-2xl font-semibold text-gray-800">Chat with Auguste</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Engage in conversations with your personal Michelin-starred AI chef. Get cooking tips, recipe ideas, and culinary guidance.
              </p>
              <div className="flex items-center text-[#B87333] group-hover:translate-x-2 transition-transform">
                <span className="font-medium">Start Chatting</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </div>
          </Link>

          {/* DeepChef Card */}
          <Link to="/kitchen" className="group">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#E5D3B3] hover:border-[#B87333]">
              <div className="flex items-center gap-4 mb-4">
                <UtensilsCrossed className="w-8 h-8 text-[#B87333]" />
                <h2 className="text-2xl font-semibold text-gray-800">Enter the Kitchen</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Upload food images or list your ingredients to get personalized recipes and cooking instructions from our AI chef.
              </p>
              <div className="flex items-center text-[#B87333] group-hover:translate-x-2 transition-transform">
                <span className="font-medium">Start Cooking</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </div>
          </Link>

          {/* Profile Creation Card */}
          <Link to="/profile" className="group">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-[#E5D3B3] hover:border-[#B87333]">
              <div className="flex items-center gap-4 mb-4">
                <UserCircle className="w-8 h-8 text-[#B87333]" />
                <h2 className="text-2xl font-semibold text-gray-800">Create Profile</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Set up your cooking profile with dietary preferences, skill level, and kitchen equipment for personalized recommendations.
              </p>
              <div className="flex items-center text-[#B87333] group-hover:translate-x-2 transition-transform">
                <span className="font-medium">Customize Experience</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </div>
          </Link>
        </div>

        {/* Bottom Feature Highlights */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Professional Expertise</h3>
            <p className="text-gray-600">Access Michelin-star level culinary knowledge and techniques</p>
          </div>
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Image Recognition</h3>
            <p className="text-gray-600">Upload photos of ingredients for instant recipe suggestions</p>
          </div>
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Personalized Recipes</h3>
            <p className="text-gray-600">Get custom recipes based on your available ingredients</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default homepage;