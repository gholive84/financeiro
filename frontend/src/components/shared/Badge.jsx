import React from 'react';

export default function Badge({ label, color = '#6366F1', textColor = '#fff', size = 'sm' }) {
  const sizes = { xs: 'text-xs px-1.5 py-0.5', sm: 'text-xs px-2 py-1', md: 'text-sm px-2.5 py-1' };
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizes[size]}`}
      style={{ backgroundColor: color + '22', color }}
    >
      {label}
    </span>
  );
}
