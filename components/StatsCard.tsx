import React from "react";

interface StatsCardProps {
  title: string;
  value: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value }) => {
  return (
    <div className="card-interactive group select-none p-4">
      <h3 className="font-mono text-sm uppercase tracking-wider text-light-fourth">
        {title}
      </h3>
      <p className="text-lg font-semibold text-white leading-none mt-1 group-hover:text-accent-primary transition-colors duration-300">
        {value}
      </p>
    </div>
  );
};

export default StatsCard;
