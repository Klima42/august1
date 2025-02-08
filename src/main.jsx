// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AIChatAssistant from './AIChatAssistant';
import DeepChef from './deepchef';

const App = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">Chef GPT</h1>
      
      {/* Main content container */}
      <div className="space-y-6">
        {/* Original AIChatAssistant */}
        <AIChatAssistant 
          company="ExampleCorp" 
          domain="example.com" 
          companies={["ExampleCorp", "AnotherCorp"]} 
        />
        
        {/* New DeepChef component */}
        <DeepChef />
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);