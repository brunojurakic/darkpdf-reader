import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Square, X, Copy, Terminal } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      
      
      window.electronAPI.onWindowMaximized(setIsMaximized);
      
      return () => {
        window.electronAPI.removeWindowMaximizedListener();
      };
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow().then(setIsMaximized);
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  const handleToggleDevTools = () => {
    if (window.electronAPI) {
      window.electronAPI.toggleDevTools();
    }
  };

  return (
    <div className="flex items-center justify-between h-8 bg-card border-b border-border text-foreground select-none">
      {}
      <div 
        className="flex items-center flex-1 h-full px-4 cursor-move" 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
          <span className="text-sm font-medium">DarkPDF Reader</span>
      </div>

      {}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center gap-1 px-2">
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer h-6 w-6 p-0"
            onClick={handleToggleDevTools}
            title="Toggle Developer Tools"
          >
            <Terminal className="h-3 w-3" />
          </Button>
          <ThemeToggle />
        </div>
        
        {}
        <div className="flex">
          <Button
            variant="ghost"
            size="sm"
            className='cursor-pointer rounded-none'
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minus className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className='cursor-pointer rounded-none'
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Copy className="h-3 w-3" />
            ) : (
              <Square className="h-3 w-3" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className='cursor-pointer rounded-none'
            onClick={handleClose}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
