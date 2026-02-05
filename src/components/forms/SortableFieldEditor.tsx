import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FieldEditor from './FieldEditor';
import type { FormField } from '@/types';

interface SortableFieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
}

const SortableFieldEditor: React.FC<SortableFieldEditorProps> = ({ 
  field, 
  onUpdate, 
  onRemove 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <FieldEditor
        field={field}
        onUpdate={onUpdate}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

export default SortableFieldEditor;
