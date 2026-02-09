'use client'

import React from "react"
import { motion } from 'framer-motion'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  gradient?: boolean
  index?: number
}

export function FeatureCard({ icon, title, description, gradient = false, index = 0 }: FeatureCardProps) {
  return (
    <motion.div 
      className={`group relative p-6 rounded-xl border transition-all duration-300 hover:border-secondary hover:shadow-xl hover:shadow-primary/5 overflow-hidden ${
        gradient 
          ? 'bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30' 
          : 'bg-card/50 border-border hover:bg-card/80'
      }`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon container */}
      <motion.div 
        className="relative mb-4 w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-secondary border border-primary/20 group-hover:scale-110 transition-transform duration-300"
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.5 }}
      >
        {icon}
      </motion.div>
      
      <h3 className="relative text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="relative text-muted-foreground leading-relaxed">{description}</p>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </motion.div>
  )
}
