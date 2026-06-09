"use client";

import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

interface CustomAlertProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

export default function CustomAlert({ isOpen, type, title, message, onClose }: CustomAlertProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling when alert is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      color: 'text-[var(--color-neon-green)]',
      border: 'border-[var(--color-neon-green)]/40',
      shadow: 'shadow-[0_0_25px_rgba(57,255,20,0.15)]',
      btnBg: 'bg-[var(--color-neon-green)] hover:bg-[var(--color-neon-green)]/90 text-black',
    },
    error: {
      icon: AlertTriangle,
      color: 'text-red-500',
      border: 'border-red-500/40',
      shadow: 'shadow-[0_0_25px_rgba(239,68,68,0.15)]',
      btnBg: 'bg-red-600 hover:bg-red-700 text-white',
    },
    info: {
      icon: Info,
      color: 'text-[var(--color-neon-purple)]',
      border: 'border-[var(--color-neon-purple)]/40',
      shadow: 'shadow-[0_0_25px_rgba(188,19,254,0.15)]',
      btnBg: 'bg-[var(--color-neon-purple)] hover:bg-[var(--color-neon-purple)]/90 text-white',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className={`w-full max-w-sm bg-[var(--color-dark-surface)]/95 border ${config.border} ${config.shadow} rounded-2xl overflow-hidden p-6 relative flex flex-col items-center text-center transform scale-100 transition-transform duration-300 animate-in fade-in zoom-in-95`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className={`p-3 rounded-full bg-white/5 mb-4 ${config.color}`}>
          <Icon size={40} className="animate-pulse" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Button */}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-xl font-bold transition-all transform active:scale-95 text-sm ${config.btnBg}`}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
