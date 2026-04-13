export const DNAHelix = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 80 200" className={`${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    {Array.from({ length: 10 }).map((_, i) => {
      const y = i * 20 + 10;
      const offset = Math.sin(i * 0.8) * 20;
      return (
        <g key={i}>
          <circle cx={40 + offset} cy={y} r="4" fill="#00d4ff" opacity={0.6 + Math.sin(i) * 0.3}>
            <animate attributeName="cx" values={`${40 + offset};${40 - offset};${40 + offset}`} dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={40 - offset} cy={y} r="4" fill="#00d4ff" opacity={0.4 + Math.cos(i) * 0.3}>
            <animate attributeName="cx" values={`${40 - offset};${40 + offset};${40 - offset}`} dur="3s" repeatCount="indefinite" />
          </circle>
          <line x1={40 + offset} y1={y} x2={40 - offset} y2={y} stroke="#00d4ff" strokeOpacity="0.15" strokeWidth="1">
            <animate attributeName="x1" values={`${40 + offset};${40 - offset};${40 + offset}`} dur="3s" repeatCount="indefinite" />
            <animate attributeName="x2" values={`${40 - offset};${40 + offset};${40 - offset}`} dur="3s" repeatCount="indefinite" />
          </line>
        </g>
      );
    })}
  </svg>
);
