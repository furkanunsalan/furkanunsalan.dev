"use client";

import React, { useEffect, useState } from "react";

const Time: React.FC<{ location: string; shortName: string }> = (props) => {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: props.location,
        hour12: false, // 24-hour format
      });
      const formattedTime = formatter.format(now);
      setTime(formattedTime);
    };

    updateTime(); // Initial call
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [props.location]);

  return (
    <div>
      {time} @{props.shortName}
    </div>
  );
};

export default Time;
