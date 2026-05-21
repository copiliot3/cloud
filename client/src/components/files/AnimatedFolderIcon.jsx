import React from 'react';
import { getFileType } from '../../utils/fileTypes';
import useUIStore from '../../stores/useUIStore';

export default function AnimatedFolderIcon({ isEmpty, previews = [], className = '', animate = true, path }) {
  const { folderColor: globalFolderColor, customFolderColors, enableAnimations } = useUIStore();
  
  const hasPreviews = previews && previews.length > 0;
  const shouldAnimate = animate && enableAnimations;

  // Resolve color: custom color for this folder > global setting > default fallback
  const baseColor = customFolderColors[path] || globalFolderColor || '#3fa0f6';

  // For stacked pages, we render back-to-front.
  const stackOffsets = [
    { rotate: '-8deg', x: 22, y: 25, hoverX: -4 },
    { rotate: '0deg', x: 30, y: 24, hoverX: 0 },
    { rotate: '8deg', x: 38, y: 27, hoverX: 4 },
  ];

  return (
    <svg viewBox="0 0 100 100" className={`overflow-visible pointer-events-none ${className}`}>
      {/* Shadow behind folder */}
      <path 
        d="M 10 22 Q 10 14 18 14 L 35 14 Q 40 14 43 18 L 47 24 L 88 24 Q 95 24 95 31 L 95 90 Q 95 97 88 97 L 12 97 Q 5 97 5 90 Z" 
        fill="rgba(0,0,0,0.06)" 
        className="translate-y-[2px]"
      />
      
      {/* Back flap (lighter) */}
      <path 
        d="M 10 20 Q 10 12 18 12 L 35 12 Q 40 12 43 16 L 47 22 L 88 22 Q 95 22 95 29 L 95 88 Q 95 95 88 95 L 12 95 Q 5 95 5 88 Z" 
        fill={baseColor}
        style={{ filter: 'brightness(1.15) saturate(0.9)' }} 
      />
      
      {/* Documents inside */}
      {isEmpty === false && (
        <g className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] origin-bottom ${shouldAnimate ? 'group-hover:-translate-y-3.5' : ''}`}>
          {hasPreviews ? (
            previews.slice(0, 3).map((ext, idx) => {
              const type = ext === 'directory' 
                ? getFileType({ isDirectory: true }) 
                : getFileType({ isDirectory: false, extension: ext });
              
              let posIdx = 1; 
              if (previews.length === 2) posIdx = idx === 0 ? 0 : 2;
              if (previews.length >= 3) posIdx = idx;

              const offset = stackOffsets[posIdx];
              const hoverClass = shouldAnimate 
                ? (posIdx === 0 ? 'group-hover:-translate-x-2' : posIdx === 2 ? 'group-hover:translate-x-2' : '')
                : '';

              return (
                <g 
                  key={idx} 
                  className="transition-transform duration-500 ease-out"
                  style={{ 
                    transform: `rotate(${offset.rotate})`,
                    transformOrigin: '50px 85px'
                  }}
                >
                  <rect 
                    x={offset.x} 
                    y={offset.y} 
                    width="32" 
                    height="45" 
                    rx="3" 
                    fill="#ffffff" 
                    stroke="rgba(0,0,0,0.12)" 
                    strokeWidth="0.5" 
                    className={`transition-transform duration-500 ${hoverClass}`}
                  />
                  
                  <foreignObject 
                    x={offset.x + 4} 
                    y={offset.y + 4} 
                    width="24" 
                    height="24"
                    className={`transition-transform duration-500 ${hoverClass}`}
                  >
                    <div xmlns="http://www.w3.org/1999/xhtml" className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]" style={{ color: type.color }}>
                        {type.icon}
                      </span>
                    </div>
                  </foreignObject>

                  <rect x={offset.x + 8} y={offset.y + 30} width="16" height="1.5" rx="0.5" fill="#e2e8f0" className={`transition-transform duration-500 ${hoverClass}`} />
                  <rect x={offset.x + 8} y={offset.y + 35} width="12" height="1.5" rx="0.5" fill="#e2e8f0" className={`transition-transform duration-500 ${hoverClass}`} />
                </g>
              );
            })
          ) : (
            <>
              <rect x="30" y="24" width="40" height="55" rx="3" fill="#ffffff" />
              <rect x="29" y="24" width="40" height="55" rx="3" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
              <rect x="40" y="35" width="20" height="2" rx="1" fill="#f1f5f9" />
              <rect x="40" y="42" width="15" height="2" rx="1" fill="#f1f5f9" />
              <rect x="40" y="49" width="18" height="2" rx="1" fill="#f1f5f9" />
            </>
          )}
        </g>
      )}

      {/* Front flap (main color) */}
      <path 
        d="M 5 35 Q 5 30 12 30 L 88 30 Q 95 30 95 37 L 95 88 Q 95 95 88 95 L 12 95 Q 5 95 5 88 Z" 
        fill={baseColor}
        className={`transition-transform duration-500 ease-out origin-bottom ${shouldAnimate ? 'group-hover:scale-y-[0.95] group-hover:rotate-x-2' : ''}`}
      />
      
      {/* Front flap highlight line */}
      <path 
        d="M 12 31 L 88 31" 
        stroke="#ffffff" 
        strokeWidth="1.5" 
        strokeOpacity="0.4" 
        fill="none" 
      />
    </svg>
  );
}

