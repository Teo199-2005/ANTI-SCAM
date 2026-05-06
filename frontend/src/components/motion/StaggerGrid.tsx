"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function StaggerGrid({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
    >
      {children}
    </motion.div>
  );
}
