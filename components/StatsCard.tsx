import React from 'react';

interface StatsCardProps {
  title: string;
  value: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value }) => {
  return (
    <div className="bg-zinc-800 rounded-lg shadow-lg p-2 border border-zinc-700">
      <h3 className="font-mono text-sm uppercase tracking-wider opacity-50 dark:opacity-40">{title}</h3>
      <p className="text-lg font-semibold leading-none">{value}</p>
    </div>
  );
};

export default StatsCard;
