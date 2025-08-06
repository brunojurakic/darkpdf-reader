import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

document.documentElement.classList.add('dark');

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
} else {
  console.error('Root element not found');
}
