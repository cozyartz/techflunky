import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Bento3DCardProps {
  children: React.ReactNode;
  className?: string;
}

export const Bento3DCard: React.FC<Bento3DCardProps> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className={`relative ${className}`}
    >
      <div
        style={{
          transform: "translateZ(75px)",
          transformStyle: "preserve-3d",
        }}
        className="h-full"
      >
        {children}
      </div>
      
      {/* Shadow effect */}
      <motion.div
        style={{
          transform: "translateZ(-75px) scale(0.95)",
        }}
        className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-2xl blur-xl"
      />
    </motion.div>
  );
};

// Floating animation component
export const FloatingElement: React.FC<{ children: React.ReactNode; delay?: number }> = ({ 
  children, 
  delay = 0 
}) => {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// Glowing pulse effect
export const GlowingBox: React.FC<{ children: React.ReactNode; color?: string }> = ({ 
  children, 
  color = 'purple' 
}) => {
  const colors = {
    purple: 'from-purple-400 to-indigo-400',
    blue: 'from-blue-400 to-cyan-400',
    green: 'from-green-400 to-emerald-400',
    orange: 'from-orange-400 to-red-400',
  };
  
  return (
    <div className="relative">
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r ${colors[color as keyof typeof colors]} rounded-2xl blur-xl opacity-50`}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
