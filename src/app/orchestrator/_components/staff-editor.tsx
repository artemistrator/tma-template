'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageDropZone } from './image-drop-zone';

export interface StaffMember {
  name: string;
  role?: string;
  bio?: string;
  image?: string;
}

interface StaffEditorProps {
  staff: StaffMember[];
  onChange: (staff: StaffMember[]) => void;
  /** Map of staff index → image preview data URL */
  imagePreviews?: Record<number, string>;
  /** Called when a photo is attached to a staff member */
  onImageAttach?: (index: number, file: File) => void;
  /** Called when a photo is removed */
  onImageRemove?: (index: number) => void;
}

export function StaffEditor({ staff, onChange, imagePreviews = {}, onImageAttach, onImageRemove }: StaffEditorProps) {
  const add = useCallback(() => {
    onChange([...staff, { name: '' }]);
  }, [staff, onChange]);

  const remove = useCallback(
    (index: number) => {
      onImageRemove?.(index);
      onChange(staff.filter((_, i) => i !== index));
    },
    [staff, onChange, onImageRemove],
  );

  const update = useCallback(
    (index: number, field: keyof StaffMember, value: string) => {
      const updated = [...staff];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    },
    [staff, onChange],
  );

  return (
    <div className="space-y-3">
      {staff.map((member, i) => (
        <div key={i} className="flex gap-3 items-start rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          {/* Avatar photo */}
          <div className="shrink-0">
            <ImageDropZone
              preview={imagePreviews[i] || null}
              onFile={(file) => onImageAttach?.(i, file)}
              onRemove={() => onImageRemove?.(i)}
              className="rounded-full overflow-hidden"
            />
            <p className="text-[10px] text-zinc-400 text-center mt-1">Photo</p>
          </div>
          {/* Fields */}
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={member.name}
                onChange={(e) => update(i, 'name', e.target.value)}
                placeholder="Name *"
                className="rounded-xl"
              />
              <Input
                value={member.role || ''}
                onChange={(e) => update(i, 'role', e.target.value)}
                placeholder="Role, e.g. Stylist"
                className="rounded-xl"
              />
            </div>
            <Input
              value={member.bio || ''}
              onChange={(e) => update(i, 'bio', e.target.value)}
              placeholder="Short bio (optional)"
              className="rounded-xl"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            className="text-zinc-400 hover:text-red-500 shrink-0"
          >
            &times;
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="rounded-2xl">
        + Add staff member
      </Button>
    </div>
  );
}
