import React from 'react';
import { motion } from 'motion/react';
import { SofrehLogoMark } from './icons/SofrehIcons';

export const BootScreen: React.FC = () => {
  return (
    <motion.div
      data-testid="app-boot-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] bg-[#FBF5EF] dark:bg-[#161714] flex flex-col items-center justify-center px-6 select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
      >
        <SofrehLogoMark variant="mark" className="w-24 h-24" />
        <span className="font-display font-black text-[34px] text-[#292B25] dark:text-[#F5EFE8] tracking-tight mt-3 leading-none">
          سفره
        </span>

        {/* Minimal sleek indeterminate boot bar */}
        <div
          dir="ltr"
          aria-hidden="true"
          className="w-24 h-[3px] rounded-full bg-[#E8DDD0] dark:bg-[#2A2D26] overflow-hidden mt-7 relative"
        >
          <motion.div
            initial={{ x: '-40%' }}
            animate={{ x: '160%' }}
            transition={{
              repeat: Infinity,
              repeatType: 'mirror',
              duration: 1.0,
              ease: 'easeInOut',
            }}
            className="absolute left-0 inset-y-0 w-1/2 rounded-full bg-[#F04438]"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};
