import React from 'react';
import { COLORS } from '../constants';

interface DesktopFrameProps {
  children: React.ReactNode;
  scale?: number;
}

export const DesktopFrame: React.FC<DesktopFrameProps> = ({ children, scale = 0.85 }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: 1440,
        height: 900,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.25), 0 8px 30px rgba(0,0,0,0.12)',
        border: `1px solid rgba(0,0,0,0.12)`,
        background: COLORS.parchment,
      }}
    >
      {/* macOS Title Bar */}
      <div
        style={{
          height: 36,
          background: COLORS.linen,
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 14,
          gap: 8,
        }}
      >
        {/* Traffic lights */}
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 12,
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 500,
            color: COLORS.textMuted,
            marginRight: 60,
          }}
        >
          Donna
        </div>
      </div>

      {/* App Content */}
      <div style={{ display: 'flex', height: 'calc(100% - 36px)' }}>
        {children}
      </div>
    </div>
  );
};
