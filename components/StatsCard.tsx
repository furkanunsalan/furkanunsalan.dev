import React from "react";

interface StatsCardProps {
  title: string;
  value: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value }) => {
  return (
    <div className="select-none bg-light-secondary dark:bg-dark-secondary rounded-lg shadow-lg p-4 border border-light-third hover:border-accent-primary dark:border-dark-third hover:dark:border-accent-primary transition-all duration-300">
      <h3 className="font-mono text-sm uppercase tracking-wider text-dark-fourth dark:text-zinc-400">
        {title}
      </h3>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-none">
        {value}
      </p>
    </div>
  );
};

export default StatsCard;
