'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';

type MotionDivProps = Omit<ComponentProps<typeof motion.div>, 'children'> & {
  children?: ReactNode;
};
type StaticDivProps = ComponentProps<'div'>;

const spring = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.8,
} as const;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}

function useCanHover() {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const updatePreference = () => setCanHover(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return canHover;
}

export function MotionPanel({ children, ...props }: MotionDivProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) return <div {...(props as StaticDivProps)}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionList({ children, ...props }: MotionDivProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) return <div {...(props as StaticDivProps)}>{children}</div>;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.03,
            delayChildren: 0,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, ...props }: MotionDivProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const canHover = useCanHover();

  if (prefersReducedMotion) return <div {...(props as StaticDivProps)}>{children}</div>;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12, scale: 0.99 },
        show: { opacity: 1, y: 0, scale: 1 },
      }}
      transition={spring}
      whileHover={canHover ? { y: -4 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}