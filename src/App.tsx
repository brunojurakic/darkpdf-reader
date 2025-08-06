import React from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import PdfViewer from './components/PdfViewer';

const App: React.FC = () => {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <ThemeToggle />
      
      <div className="border-b bg-card px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              Dark PDF Reader
            </h1>
            <span className="text-sm text-muted-foreground">
              A modern PDF viewer with dark theme support
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <PdfViewer />
      </div>
    </div>
  );
};

export default App;
