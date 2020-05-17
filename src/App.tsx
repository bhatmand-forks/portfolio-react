import React from 'react';
import Terminal from '~/apps/Terminal';
import { WindowManager } from '~/platform/services/WindowManager';
import { Desktop } from './platform/components/Desktop';
import { ContextMenuProvider } from './platform/providers/ContextMenuProvider/ContextMenuProvider';
import { TooltipProvider } from './platform/providers/TooltipProvider/TooltipProvider';

WindowManager.defaultApp = Terminal;

export const App = () => (
  <ContextMenuProvider>
    <TooltipProvider>
      <Desktop />
    </TooltipProvider>
  </ContextMenuProvider>
);
