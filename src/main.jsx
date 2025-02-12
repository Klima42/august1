import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import AIChatAssistant from './AIChatAssistant';
import DeepChef from './deepchef';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
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