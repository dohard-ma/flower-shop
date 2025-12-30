'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  Checkbox,
  Divider,
  Alert,
  Modal,
  Badge,
  rem,
  LoadingOverlay,
  Box,
  ActionIcon,
  SimpleGrid,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { IconInfoCircle, IconRefresh, IconCheck, IconAlertCircle, IconFileCode, IconUpload, IconX } from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';

interface Channel {
  id: string;
  code: string;
  name: string;
}

interface SyncResult {
  updatedStockCount: number;
  updatedPriceCount: number;
  newProductCount: number;
}

export default function SyncPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['meituan']);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await http.get<Channel[]>('/api/admin/channels');
      setChannels(res.data || []);
    } catch (e) {
      console.error('Failed to fetch channels');
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleSync = async () => {
    if (files.length === 0) {
      notifications.show({
        title: '错误',
        message: '请至少上传一个美团原始数据 JSON 文件',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // 在浏览器端读取文件内容
      const jsonList = await Promise.all(files.map(file => readFileAsText(file)));

      const res = await http.post<SyncResult>('/api/admin/sync/meituan', {
        jsonList,
        channels: selectedChannels,
      });

      if (res.success) {
        setResult(res.data);
        setModalOpened(true);
        setFiles([]);
        notifications.show({
          title: '同步成功',
          message: `成功处理 ${jsonList.length} 个文件`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } else {
        notifications.show({
          title: '同步失败',
          message: res.message || '未知错误',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch (e: any) {
      notifications.show({
        title: '发生错误',
        message: e.message || '读取文件或同步失败',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>数据同步 / Data Sync</Title>
      </Group>

      <Paper p="md" radius="sm" withBorder shadow="sm" pos="relative">
        <LoadingOverlay visible={loading} loaderProps={{ size: 'lg', color: 'orange', type: 'bars' }} overlayProps={{ blur: 1 }} />
        
        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={16} />} title="操作指南" color="blue" variant="light">
            <Text size="sm">
              1. 从美团后台导出原始商品分页数据 (JSON 格式)。<br />
              2. 拖拽或点击上传所有 JSON 文件（不限制文件数量）。<br />
              3. 选择同步渠道后，点击“开始同步”实现批量清洗与入库。
            </Text>
          </Alert>

          <Stack gap="sm">
            <Text size="sm" fw={600}>美团原始数据文件 (JSON)</Text>
            
            <Dropzone
              onDrop={(acceptedFiles) => setFiles(prev => [...prev, ...acceptedFiles])}
              accept={[MIME_TYPES.json]}
              maxSize={50 * 1024 ** 2} // 50MB
              styles={{ inner: { padding: rem(20) } }}
            >
              <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload
                    style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
                    stroke={1.5}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX
                    style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
                    stroke={1.5}
                  />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconFileCode
                    style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
                    stroke={1.5}
                  />
                </Dropzone.Idle>

                <div>
                  <Text size="xl" inline>
                    拖拽 JSON 文件到这里或点击上传
                  </Text>
                  <Text size="sm" c="dimmed" inline mt={7}>
                    支持上传多个分页文件，每个文件建议不超过 50MB
                  </Text>
                </div>
              </Group>
            </Dropzone>

            {files.length > 0 && (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xs" mt="md">
                {files.map((file, index) => (
                  <Paper key={index} withBorder p="xs" radius="xs" bg="gray.0">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" style={{ overflow: 'hidden' }}>
                        <IconFileCode size={18} color="gray" />
                        <Text size="xs" truncate fw={500}>{file.name}</Text>
                        <Text size="10px" c="dimmed">({(file.size / 1024).toFixed(1)} KB)</Text>
                      </Group>
                      <ActionIcon size="xs" color="red" variant="subtle" onClick={() => removeFile(index)}>
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </SimpleGrid>
            )}
          </Stack>

          <Divider label="分发策略" labelPosition="center" />

          <Stack gap="xs">
            <Text size="sm" fw={600}>价格同步渠道</Text>
            <Text size="xs" c="dimmed">勾选的渠道将根据美团价格自动更新展示价。未勾选的渠道将保持原价不变。</Text>
            <Checkbox.Group value={selectedChannels} onChange={setSelectedChannels}>
              <Group gap="xl" mt="xs">
                {channels.map((ch) => (
                  <Checkbox
                    key={ch.code}
                    value={ch.code}
                    label={ch.name}
                    disabled={ch.code === 'meituan'}
                    color="orange"
                  />
                ))}
              </Group>
            </Checkbox.Group>
            <Text size="xs" c="green.8" fw={500} mt={4}>* 库存 (Stock) 默认全量物理同步</Text>
          </Stack>

          <Divider mt="xs" />

          <Group justify="flex-end">
            <Button
              leftSection={<IconRefresh size={18} />}
              size="md"
              color="orange"
              onClick={handleSync}
              loading={loading}
              loaderProps={{ type: 'dots' }}
            >
              开始同步
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="同步结果汇总"
        centered
        radius="md"
        padding="xl"
      >
        <Stack gap="lg">
          <Group justify="center">
            <Box bg="green.0" p="md" style={{ borderRadius: '50%' }}>
              <IconCheck size={40} color="var(--mantine-color-green-7)" />
            </Box>
          </Group>
          
          <Text ta="center" fw={700} size="lg">数据同步成功！</Text>
          
          <Paper withBorder p="md" bg="gray.0">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm">库存更新条数</Text>
                <Badge color="blue" size="lg">{result?.updatedStockCount || 0}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm">价格更新条数 (跨渠道)</Text>
                <Badge color="orange" size="lg">{result?.updatedPriceCount || 0}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm">新增商品数量</Text>
                <Badge color="green" size="lg">{result?.newProductCount || 0}</Badge>
              </Group>
            </Stack>
          </Paper>

          <Button fullWidth color="orange" onClick={() => setModalOpened(false)}>
            确定
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
