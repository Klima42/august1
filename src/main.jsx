// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './homepage';
import AIChatAssistant from './AIChatAssistant';
import DeepChef from './deepchef';
import ProfileCreation from './ProfileCreation';
import NavigationMenu from './components/NavigationMenu';


const App = () => {
  return (
    <BrowserRouter>
      <NavigationMenu />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/chat" element={
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <AIChatAssistant />
          </div>
        } />
        <Route path="/kitchen" element={
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <DeepChef />
          </div>
        } />
        <Route path="/profile" element={<ProfileCreation />} />
      </Routes>
    </BrowserRouter>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);