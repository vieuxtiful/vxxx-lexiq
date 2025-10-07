import { useEffect, useState } from 'react';

interface AnimatedEllipsisProps {
  text?: string;
}

export function AnimatedEllipsis({ text = "Reanalyzing" }: AnimatedEllipsisProps) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4); // 0, 1, 2, 3 (0 = no dots, 3 = three dots)
    }, 400); // Each dot appears every 400ms

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center">
      {text}
      <span className="inline-block w-[1.5em]">
        {'.'.repeat(dots)}
      </span>
    </span>
  );
}
