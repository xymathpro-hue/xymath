// ============================================================
// XYMATH - BADGE DE LAUDO DO ALUNO
// src/components/alunos/BadgeLaudo.tsx
// ============================================================

'use client';

import { AlertCircle } from 'lucide-react';
import type { TipoLaudo } from '@/types/ficha-aluno';

interface BadgeLaudoProps {
  possuiLaudo: boolean;
  tipoLaudo?: TipoLaudo | null;
  tamanho?: 'sm' | 'md';
  mostrarTipo?: boolean;
}

export default function BadgeLaudo({ 
  possuiLaudo, 
  tipoLaudo, 
  tamanho = 'sm',
  mostrarTipo = false 
}: BadgeLaudoProps) {
  if (!possuiLaudo) return null;

  const tamanhoClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1'
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1 
        bg-yellow-900/50 text-yellow-500 
        rounded font-medium
        ${tamanhoClasses[tamanho]}
      `}
      title={tipoLaudo ? `Laudo: ${tipoLaudo}` : 'Aluno com laudo'}
    >
      <AlertCircle className={tamanho === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {mostrarTipo && tipoLaudo ? tipoLaudo : 'Laudo'}
    </span>
  );
}
