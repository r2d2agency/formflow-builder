import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FieldEditor from './FieldEditor';
import type { FormField } from '@/types';

interface SortableFieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  isQuizMode?: boolean;
}

const SortableFieldEditor: React.FC<SortableFieldEditorProps> = ({ 
  field, 
  onUpdate, 
  onRemove,
  isQuizMode 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    position: 'relative' as const,
  };

  // Combine attributes and listeners but ensure touch-action is set
  const dragHandleProps = {
    ...attributes,
    ...listeners,
    style: { touchAction: 'none' } as React.CSSProperties,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <FieldEditor
        field={field}
        onUpdate={onUpdate}
        onRemove={onRemove}
        dragHandleProps={dragHandleProps}
        isQuizMode={isQuizMode}
      />
    </div>
  );
};

export default SortableFieldEditor;
