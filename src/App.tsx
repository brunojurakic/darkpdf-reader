import React from 'react';
import { Button } from '@/components/ui/button';

const App: React.FC = () => {
  return (
    <div style={{ padding: 32 }}>
      <h1 className='text-purple-500'>Hello, React + Electron Forge + Vite + TypeScript!</h1>
      <p>test</p>
      <Button variant="outline">shadcn/ui Button</Button>
    </div>
  );
};

export default App;
