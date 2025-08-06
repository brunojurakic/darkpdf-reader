import React from 'react';
import TitleBar from './components/TitleBar';
import PdfViewer from './components/PdfViewer';

const App: React.FC = () => {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <TitleBar />

      <div className="flex-1 overflow-hidden">
        <PdfViewer />
      </div>
    </div>
  );
};

export default App;
