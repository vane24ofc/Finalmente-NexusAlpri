import * as React from 'react';
import { SVGProps } from 'react';

export const IconPlusCircle = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx={12} cy={12} r={10} />
    <line x1={12} y1={8} x2={12} y2={16} />
    <line x1={8} y1={12} x2={16} y2={12} />
  </svg>
);
