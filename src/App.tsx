import React from 'react';
import TitleBar from './components/TitleBar';
import PdfViewer from './components/PdfViewer';
import { Toaster } from 'sonner';

const App: React.FC = () => {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <TitleBar />

      <div className="flex-1 overflow-hidden">
        <PdfViewer />
      </div>
      
      <Toaster position="bottom-right" />
    </div>
  );
};

export default App;
