import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
}

export function SortableWidget({ id, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        className={cn(
            "relative group w-full",
            isDragging ? "opacity-50 scale-[1.02]" : ""
        )}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="absolute -left-3 sm:-left-5 top-8 p-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-primary transition-colors z-10 opacity-0 group-hover:opacity-100 touch-none bg-background/80 backdrop-blur-sm rounded-full shadow-sm"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      {children}
    </div>
  );
}
