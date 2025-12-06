import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 1. Find the empty div
const rootElement = document.getElementById('root');

// 2. Take control of it
const root = ReactDOM.createRoot(rootElement);

// 3. Render the entire game inside it
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
