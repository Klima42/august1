// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AIChatAssistant from './AIChatAssistant';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AIChatAssistant company="ExampleCorp" domain="example.com" companies={["ExampleCorp", "AnotherCorp"]} />
  </React.StrictMode>
);
