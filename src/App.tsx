import React from 'react';
import { Button } from '@/components/ui/button';
import PdfViewer from './components/PdfViewer';

const App: React.FC = () => {
  return (
    <div style={{ padding: 32 }}>
      <h1 className='text-purple-500'>Hello, React + Electron Forge + Vite + TypeScript!</h1>
      <p>test</p>
      <Button variant="outline">shadcn/ui Button</Button>
      <div style={{ marginTop: 32 }}>
        <PdfViewer />
      </div>
    </div>
  );
};

export default App;
