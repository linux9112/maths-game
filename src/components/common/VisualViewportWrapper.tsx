import React from 'react';
import { useVisualViewport } from './useVisualViewport';

export interface VisualViewportWrapperProps {
  children: React.ReactNode;
  className?: string;
  preventOverscroll?: boolean;
}

export const VisualViewportWrapper: React.FC<VisualViewportWrapperProps> = ({
  children,
  className = '',
  preventOverscroll = true,
}) => {
  const { isKeyboardOpen } = useVisualViewport();

  return (
    <div
      data-testid="visual-viewport-wrapper"
      data-keyboard-open={isKeyboardOpen}
      className={`w-full flex flex-col overflow-hidden select-none ${
        preventOverscroll ? 'overscroll-none' : ''
      } ${className}`}
      style={{
        height: 'var(--vvh, 100vh)',
        minHeight: 'var(--vvh, 100vh)',
        maxHeight: 'var(--vvh, 100vh)',
      }}
    >
      {children}
    </div>
  );
};
