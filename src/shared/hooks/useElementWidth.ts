import { useState, useRef, useEffect } from "react";

function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState<number>(0);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    setWidth(element.offsetWidth);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return { width, ref };
}

export default useElementWidth;
