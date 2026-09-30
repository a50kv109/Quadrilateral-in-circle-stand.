/**
 * Universal Geometry Stand — Remix 2 Entry Point
 * R2-05: Common Geometry Stand UI Shell
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';

console.log("Remix 2 Foundation Initialized Successfully!");

export const REMIX2_VERSION = "2.0.0-alpha.0";

// Mount the React Application Shell into #root in DOM environments
if (typeof document !== 'undefined') {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      React.createElement(React.StrictMode, null, React.createElement(App))
    );
  }
}
