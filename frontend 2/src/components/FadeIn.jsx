import React, { useEffect, useRef, useState } from 'react';

/**
 * FadeIn component triggers a smooth fade-in and slide-up animation
 * using IntersectionObserver as elements scroll into view.
 */
export default function FadeIn({
  children,
  className = '',
  delay = 0,
  duration = 700,
  threshold = 0.12,
  as: Component = 'div',
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const delayClass =
    delay === 100
      ? 'delay-100'
      : delay === 200
      ? 'delay-200'
      : delay === 300
      ? 'delay-300'
      : delay === 400
      ? 'delay-400'
      : delay === 500
      ? 'delay-500'
      : '';

  return (
    <Component
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${delayClass} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function FadeInStagger({
  children,
  className = '',
  stagger = 100,
  as: Component = 'div',
  ...props
}) {
  return (
    <Component className={className} {...props}>
      {React.Children.map(children, (child, idx) => {
        if (!React.isValidElement(child)) return child;
        return (
          <FadeIn delay={idx * stagger} className="h-full">
            {child}
          </FadeIn>
        );
      })}
    </Component>
  );
}
