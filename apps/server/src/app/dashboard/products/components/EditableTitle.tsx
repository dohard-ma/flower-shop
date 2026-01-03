import { useState, useRef, useEffect } from 'react';
import { Text, TextInput, UnstyledButton, Group, rem } from '@mantine/core';
import { IconPencil, IconCheck, IconX } from '@tabler/icons-react';
import { useHover } from '@mantine/hooks';

interface EditableTitleProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
}

export function EditableTitle({ value, onSave }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { hovered, ref: hoverRef } = useHover();

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (tempValue === value) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      await onSave(tempValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save title', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Group gap={4} wrap="nowrap" style={{ width: '100%' }}>
        <TextInput
          ref={inputRef}
          value={tempValue}
          onChange={(e) => setTempValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          size="xs"
          disabled={loading}
          style={{ flex: 1 }}
        />
        <UnstyledButton onClick={handleSave} disabled={loading}>
          <IconCheck size={16} color="var(--mantine-color-green-6)" />
        </UnstyledButton>
        <UnstyledButton onClick={handleCancel} disabled={loading}>
          <IconX size={16} color="var(--mantine-color-gray-5)" />
        </UnstyledButton>
      </Group>
    );
  }

  return (
    <div ref={hoverRef} style={{ display: 'flex', alignItems: 'center', gap: rem(4), minHeight: rem(24) }}>
      <Text
        size="sm"
        fw={600}
        lineClamp={1}
        style={{ 
          color: '#212529',
          flexShrink: 1,
          cursor: 'text' // 提示可以进行文本选择
        }}
      >
        {value}
      </Text>
      {hovered && (
        <UnstyledButton 
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          style={{ display: 'flex' }}
        >
          <IconPencil size={14} color="var(--mantine-color-blue-6)" />
        </UnstyledButton>
      )}
    </div>
  );
}
