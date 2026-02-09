'use client'

import React from "react"

import { useEffect, useState } from 'react'

interface StatCardProps {
  value: string
  label: string
  icon?: React.ReactNode
}

export function StatCard({ value, label, icon }: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className={`text-center p-6 rounded-lg border border-border bg-card/30 hover:bg-card/60 transition-all transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      {icon && <div className="mb-4 text-secondary">{icon}</div>}
      <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
        {value}
      </p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  )
}
