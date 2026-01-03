'use client';

import React, { useState, useEffect } from 'react';
import { Group, Text, Image, SimpleGrid, Card, ActionIcon, Modal, rem, Box, Center, Stack } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from '@mantine/dropzone';
import { IconUpload, IconX, IconEye, IconPhoto } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

interface ImageUploadProps {
  value?: string[];
  onChange?: (files: (string | File)[]) => void;
  maxFiles?: number;
  accept?: string[];
  disabled?: boolean;
}

export function ImageUpload({
  value = [],
  onChange,
  maxFiles = 5,
  accept = IMAGE_MIME_TYPE,
  disabled = false,
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<(string | File)[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    setPreviews(value);
  }, [value]);

  const handleDrop = (files: FileWithPath[]) => {
    const remainingSlots = maxFiles - previews.length;
    const newFiles = files.slice(0, remainingSlots);
    const updated = [...previews, ...newFiles];
    setPreviews(updated);
    onChange?.(updated);
  };

  const removeImage = (index: number) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onChange?.(updated);
  };

  const getUrl = (item: string | File) => {
    if (typeof item === 'string') return item;
    return URL.createObjectURL(item);
  };

  const previewItems = previews.map((file, index) => {
    const url = getUrl(file);
    return (
      <Card key={index} withBorder padding="xs" radius="md" pos="relative">
        <Box pos="relative" style={{ aspectRatio: '1/1', overflow: 'hidden', borderRadius: rem(4) }}>
          <Image src={url} alt={`预览 ${index}`} fit="cover" />
          <Box
            pos="absolute"
            inset={0}
            bg="rgba(0,0,0,0.5)"
            style={{
              opacity: 0,
              transition: 'opacity 200ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: rem(8)
            }}
            className="hover-overlay"
          >
            <ActionIcon
              variant="filled"
              color="white"
              onClick={() => {
                setSelectedImage(url);
                open();
              }}
            >
              <IconEye size={16} color="black" />
            </ActionIcon>
            <ActionIcon variant="filled" color="red" onClick={() => removeImage(index)}>
              <IconX size={16} />
            </ActionIcon>
          </Box>
        </Box>
        <style jsx>{`
          div:hover .hover-overlay {
            opacity: 1 !important;
          }
        `}</style>
      </Card>
    );
  });

  return (
    <Box>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
        {previewItems}
        {previews.length < maxFiles && (
          <Dropzone
            onDrop={handleDrop}
            maxSize={5 * 1024 ** 2}
            accept={accept}
            disabled={disabled}
            styles={{
              root: {
                aspectRatio: '1/1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderStyle: 'dashed',
              },
            }}
          >
            <Stack align="center" gap="xs" style={{ pointerEvents: 'none' }}>
              <Dropzone.Accept>
                <IconUpload size={32} stroke={1.5} color="var(--mantine-color-blue-6)" />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={32} stroke={1.5} color="var(--mantine-color-red-6)" />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size={32} stroke={1.5} color="var(--mantine-color-dimmed)" />
              </Dropzone.Idle>

              <Text size="xs" ta="center" inline c="dimmed">
                点击或拖拽上传
              </Text>
            </Stack>
          </Dropzone>
        )}
      </SimpleGrid>

      <Modal opened={opened} onClose={close} size="xl" title="图片预览" centered>
        {selectedImage && <Image src={selectedImage} alt="预览" fit="contain" mah="80vh" />}
      </Modal>
    </Box>
  );
}
