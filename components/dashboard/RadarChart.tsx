'use client';

import React from 'react';

interface RadarChartProps {
  scores: {
    codeQuality: number;
    problemSolving: number;
    technicalKnowledge: number;
    systemDesign: number;
    communication: number;
  };
  size?: number;
}

export default function RadarChart({ scores, size = 300 }: RadarChartProps) {
  const center = 150;
  const maxRadius = 100;

  // The 5 dimensions
  const dimensions = [
    { key: 'codeQuality', label: 'Code Quality', score: scores.codeQuality },
    { key: 'problemSolving', label: 'Problem Solving', score: scores.problemSolving },
    { key: 'technicalKnowledge', label: 'Tech Knowledge', score: scores.technicalKnowledge },
    { key: 'systemDesign', label: 'System Design', score: scores.systemDesign },
    { key: 'communication', label: 'Communication', score: scores.communication },
  ];

  // Helper to calculate X and Y coordinates for a score on a given axis index
  const getCoordinates = (index: number, score: number, radius = maxRadius) => {
    // 5 dimensions => angle step is 72 degrees (2 * PI / 5)
    // Subtract PI / 2 to rotate the first axis to point straight up
    const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
    const x = center + (score / 100) * radius * Math.cos(angle);
    const y = center + (score / 100) * radius * Math.sin(angle);
    return { x, y };
  };

  // 1. Concentric pentagons (grid lines) at 20%, 40%, 60%, 80%, 100%
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPolygons = gridLevels.map((level) => {
    const points = dimensions.map((_, idx) => {
      const { x, y } = getCoordinates(idx, level);
      return `${x},${y}`;
    }).join(' ');
    return points;
  });

  // 2. Candidate score polygon points
  const scorePoints = dimensions.map((d, idx) => {
    const { x, y } = getCoordinates(idx, d.score);
    return `${x},${y}`;
  }).join(' ');

  // 3. Axis lines (from center to max radius)
  const axisLines = dimensions.map((_, idx) => {
    const start = { x: center, y: center };
    const end = getCoordinates(idx, 100);
    return { start, end };
  });

  return (
    <div className="flex flex-col items-center justify-center bg-[#151d1e]/20 border border-[#3b494b]/30 p-4 rounded-xl shadow-inner select-none w-full">
      <svg
        viewBox="0 0 300 300"
        className="w-full max-w-[280px] h-auto drop-shadow-[0_0_15px_rgba(6,182,212,0.15)]"
      >
        {/* Concentric grid pentagons */}
        {gridPolygons.map((points, idx) => (
          <polygon
            key={idx}
            points={points}
            fill="none"
            stroke="#3b494b"
            strokeWidth="0.5"
            strokeDasharray={idx < 4 ? "2,2" : "none"}
            opacity={0.7}
          />
        ))}

        {/* Axis Lines */}
        {axisLines.map((line, idx) => (
          <line
            key={idx}
            x1={line.start.x}
            y1={line.start.y}
            x2={line.end.x}
            y2={line.end.y}
            stroke="#3b494b"
            strokeWidth="1"
            opacity={0.8}
          />
        ))}

        {/* Filled polygon for candidate scores */}
        <polygon
          points={scorePoints}
          fill="rgba(6, 182, 212, 0.25)"
          stroke="#06B6D4"
          strokeWidth="2"
          className="transition-all duration-500 ease-in-out"
        />

        {/* Data points (circles at each coordinate) */}
        {dimensions.map((d, idx) => {
          const { x, y } = getCoordinates(idx, d.score);
          return (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="#F1F5F9"
                stroke="#06B6D4"
                strokeWidth="2"
              />
              {/* Tooltip background & text */}
              <text
                x={x}
                y={y - 10}
                textAnchor="middle"
                className="opacity-0 group-hover:opacity-100 fill-white text-[10px] font-bold font-mono transition-opacity pointer-events-none"
              >
                {d.score}
              </text>
            </g>
          );
        })}

        {/* Axis Labels */}
        {dimensions.map((d, idx) => {
          // Place labels slightly outside the 100% boundary (radius = 118)
          const angle = (idx * 2 * Math.PI) / 5 - Math.PI / 2;
          const labelDist = 118;
          const x = center + labelDist * Math.cos(angle);
          const y = center + labelDist * Math.sin(angle);

          // Adjust text anchor dynamically based on angle orientation
          let textAnchor: 'start' | 'end' | 'middle' = 'middle';
          if (Math.cos(angle) > 0.1) textAnchor = 'start';
          if (Math.cos(angle) < -0.1) textAnchor = 'end';

          return (
            <text
              key={idx}
              x={x}
              y={y + 3} // vertical offset adjustment
              textAnchor={textAnchor}
              className="fill-[#b9cacb] text-[9px] font-bold uppercase tracking-wider font-mono select-none"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Numerical score indicators */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 w-full mt-4 text-xs border-t border-[#3b494b]/30 pt-3 font-mono">
        {dimensions.map((d) => (
          <div key={d.key} className="flex justify-between items-center text-[10px]">
            <span className="text-[#94A3B8]">{d.label}:</span>
            <span className="text-[#06B6D4] font-bold">{d.score}/100</span>
          </div>
        ))}
      </div>
    </div>
  );
}
