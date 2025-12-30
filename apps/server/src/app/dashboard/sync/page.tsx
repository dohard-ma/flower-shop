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
  ScrollArea,
  Accordion,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { IconInfoCircle, IconRefresh, IconCheck, IconAlertCircle, IconFileCode, IconUpload, IconX, IconPackage } from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';
import { useMemo } from 'react';

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

interface ExtensionFile {
  name: string;
  content: string;
  categoryName?: string;
  pageNum?: number;
}

export default function SyncPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['meituan']);
  const [files, setFiles] = useState<File[]>([]);
  const [extensionFiles, setExtensionFiles] = useState<ExtensionFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [isExtension, setIsExtension] = useState(false);

  // 插件交互相关
  const [detectedCategories, setDetectedCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);

  // 分组后的插件文件
  const groupedExtensionFiles = useMemo(() => {
    const groups: Record<string, ExtensionFile[]> = {};
    extensionFiles.forEach(file => {
      const cat = file.categoryName || '未分类';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(file);
    });

    // 排序逻辑：
    // 1. 分类按照 detectedCategories 的顺序排列
    // 2. 每个分类内部按页码升序排列
    const sortedGroups: Record<string, ExtensionFile[]> = {};
    
    // 首先处理已知分类
    detectedCategories.forEach(cat => {
      if (groups[cat]) {
        sortedGroups[cat] = groups[cat].sort((a, b) => (a.pageNum || 0) - (b.pageNum || 0));
      }
    });

    // 处理可能不在 detectedCategories 中的分类 (防御性)
    Object.keys(groups).forEach(cat => {
      if (!sortedGroups[cat]) {
        sortedGroups[cat] = groups[cat].sort((a, b) => (a.pageNum || 0) - (b.pageNum || 0));
      }
    });

    return sortedGroups;
  }, [extensionFiles, detectedCategories]);

  const handleDownload = (name: string, content: string) => {
    try {
      const blob = new Blob([content], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name.endsWith('.json') ? name : `${name}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      notifications.show({ title: '下载失败', message: '无法生成下载文件', color: 'red' });
    }
  };

  const removeExtensionFileByName = (name: string) => {
    setExtensionFiles(prev => prev.filter(f => f.name !== name));
  };

  useEffect(() => {
    fetchChannels();
    
    // 监听来自插件的消息
    const handleMessage = (event: MessageEvent) => {
      // 验证来源（可选）
      const { type, data, categories } = event.data;
      
      if (type === 'EXTENSION_READY') {
        setIsExtension(true);
        notifications.show({
          title: '插件已连接',
          message: '已成功与浏览器插件建立连接，可以开始抓取数据',
          color: 'teal',
        });
      }

      if (type === 'CATEGORIES_DETECTED') {
        const newCategories = categories || [];
        if (newCategories.length > 0) {
          // 成功检测到分类
          setDetectedCategories(newCategories);
          setSelectedCategories(newCategories);
          setConfirmModalOpened(true);
          // 清理之前的“正在扫描”或“识别失败”的临时通知
          notifications.clean();
        } else {
          // 只有在当前完全没有识别到任何分类时，才提示警告
          // 使用 setDetectedCategories 的函数式更新来判断当前状态
          setDetectedCategories(prev => {
            if (prev.length === 0) {
              notifications.show({
                id: 'mt-scan-status',
                title: '未检测到分类',
                message: '识别完成，但当前页面未发现有效商品分类，请确认已进入“商品管理”页面后再试。',
                color: 'yellow',
                autoClose: 3000,
              });
            }
            return prev;
          });
        }
      }

      if (type === 'SCAN_FAILED') {
        notifications.show({
          title: '识别失败',
          message: event.data.message || '由于页面响应缓慢或结构异常，分类识别失败。',
          color: 'red',
          autoClose: 5000,
        });
      }

      if (type === 'CLEAR_SYNC_LIST') {
        setExtensionFiles([]);
      }

      if (type === 'MEITUAN_DATA_UPDATED') {
        const { categoryName, pageNum, url, data: payload } = data;
        const timestamp = new Date().toLocaleTimeString();
        
        let fileName = '';
        if (categoryName) {
          fileName = `[插件抓取] ${categoryName}${pageNum ? ` - 第 ${pageNum} 页` : ''}.json`;
        } else {
          const urlObj = new URL(url);
          fileName = `[插件抓取] ${urlObj.searchParams.get('tagName') || '全部'} - ${timestamp}.json`;
        }
        
        setExtensionFiles(prev => [
          { 
            name: fileName, 
            content: JSON.stringify(payload),
            categoryName,
            pageNum
          },
          ...prev
        ]);
        
        notifications.show({
          title: '已捕获数据',
          message: `分类: ${categoryName || '未知'} | 页码: ${pageNum || 1}`,
          color: 'blue',
          autoClose: 1500,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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
    if (files.length === 0 && extensionFiles.length === 0) {
      notifications.show({
        title: '错误',
        message: '请至少提供一个数据源（上传文件或通过插件抓取）',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // 合并本地文件和插件抓取的内容
      const localJsonList = await Promise.all(files.map(file => readFileAsText(file)));
      const extensionJsonList = extensionFiles.map(ef => ef.content);
      const jsonList = [...localJsonList, ...extensionJsonList];

      const res = await http.post<SyncResult>('/api/admin/sync/meituan', {
        jsonList,
        channels: selectedChannels,
      });

      if (res.success) {
        setResult(res.data);
        setModalOpened(true);
        setFiles([]);
        setExtensionFiles([]);
        notifications.show({
          title: '同步成功',
          message: `成功处理 ${jsonList.length} 个数据包`,
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
        message: e.message || '数据处处理或同步失败',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmExecute = () => {
    if (selectedCategories.length === 0) {
      notifications.show({
        title: '警告',
        message: '请至少勾选一个分类进行抓取',
        color: 'red',
      });
      return;
    }

    setConfirmModalOpened(false);
    window.parent.postMessage({ 
      type: 'START_SCRAPE_EXECUTION', 
      categories: selectedCategories 
    }, '*');

    notifications.show({
      title: '开始抓取',
      message: `正在抓取已选的 ${selectedCategories.length} 个分类数据...`,
      color: 'blue',
    });
  };

  const startAutoScrape = () => {
    // 触发插件进行预扫描分类
    window.parent.postMessage({ type: 'START_AUTO_SCRAPE' }, '*');
    notifications.show({
      id: 'mt-scan-status',
      title: '正在扫描分类',
      message: '请稍候，正在识别美团后台的有效商品分类...',
      color: 'orange',
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExtensionFile = (index: number) => {
    setExtensionFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>数据同步 / Data Sync</Title>
      </Group>

      <Paper p="md" radius="sm" withBorder shadow="sm" pos="relative">
        <LoadingOverlay visible={loading} loaderProps={{ size: 'lg', color: 'orange', type: 'bars' }} overlayProps={{ blur: 1 }} />
        
        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={16} />} title="操作指南 / Guide" color="blue" variant="light">
            <Stack gap={4}>
              <Text size="sm">1. <b>插件同步：</b>在美团后台打开本插件侧边栏，点击“自动抓取”或手动切换分类。</Text>
              <Text size="sm">2. <b>文件同步：</b>拖拽美团导出的原始 JSON 文件到下方区域。</Text>
              <Text size="sm">3. <b>开始同步：</b>确认上方列表中出现数据后，点击右下角按钮执行入库。</Text>
            </Stack>
          </Alert>

            {isExtension && (
              <Paper p="xs" radius="xs" withBorder bg="orange.0">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Badge color="orange" variant="filled">插件已就绪</Badge>
                    <Text size="xs" fw={500}>已检测到来自浏览器的连接，可实时拦截美团数据</Text>
                  </Group>
                  <Button size="compact-xs" color="orange" onClick={startAutoScrape}>
                    开始抓取分类数据
                  </Button>
                </Group>
              </Paper>
            )}

            <Stack gap="sm">
              <Group justify="space-between" align="flex-end">
                <Text size="sm" fw={600}>待同步数据源 / Data Sources</Text>
                {extensionFiles.length > 0 && (
                  <Button size="compact-xs" variant="subtle" color="red" onClick={() => setExtensionFiles([])}>
                    清空已抓取 ({extensionFiles.length})
                  </Button>
                )}
              </Group>
              
              <Dropzone
                onDrop={(acceptedFiles) => setFiles(prev => [...prev, ...acceptedFiles])}
                accept={['application/json']}
                maxSize={50 * 1024 ** 2} // 50MB
                styles={{ inner: { padding: rem(20) } }}
              >
                <Group justify="center" gap="md" mih={80} style={{ pointerEvents: 'none' }}>
                  <IconFileCode style={{ width: rem(30), height: rem(30), color: 'var(--mantine-color-dimmed)' }} stroke={1.5} />
                  <Text size="sm" c="dimmed">拖拽或点击上传本地 JSON</Text>
                </Group>
              </Dropzone>

              {(files.length > 0 || extensionFiles.length > 0) && (
                <Stack gap="xs" mt="md">
                  <Text size="xs" fw={700} c="dimmed">待处理数据列表 / Pending Sync</Text>
                  
                  {/* 分类折叠列表 (插件抓取) */}
                  {extensionFiles.length > 0 && (
                    <Accordion variant="separated" radius="xs" chevronPosition="left" defaultValue="MT-Groups">
                      <Accordion.Item value="MT-Groups">
                        <Accordion.Control bg="blue.0" icon={<IconUpload size={16} color="blue" />}>
                          <Group gap="xs">
                            <Text size="xs" fw={700}>插件抓取数据分组 ({Object.keys(groupedExtensionFiles).length})</Text>
                            <Badge size="xs" variant="outline">{extensionFiles.length} 个数据包</Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel p={0}>
                          <Accordion variant="contained" mt="xs">
                            {Object.entries(groupedExtensionFiles).map(([category, items]) => (
                              <Accordion.Item key={category} value={category}>
                                <Accordion.Control>
                                  <Group justify="space-between" pr="md">
                                    <Text size="xs" fw={600}>{category}</Text>
                                    <Badge size="xs" color="gray" variant="light">{items.length} 页</Badge>
                                  </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                  <Stack gap={4}>
                                    {items.map((file, idx) => (
                                      <Paper key={idx} withBorder p="xs" radius="xs" bg="gray.1">
                                        <Group justify="space-between" wrap="nowrap">
                                          <Text size="xs" c="dimmed">第 {file.pageNum || 1} 页</Text>
                                          <Group gap={4}>
                                            <ActionIcon size="sm" variant="subtle" color="blue" title="下载数据" onClick={() => handleDownload(file.name, file.content)}>
                                              <IconUpload size={14} />
                                            </ActionIcon>
                                            <ActionIcon size="sm" variant="subtle" color="red" title="移除" onClick={() => removeExtensionFileByName(file.name)}>
                                              <IconX size={14} />
                                            </ActionIcon>
                                          </Group>
                                        </Group>
                                      </Paper>
                                    ))}
                                  </Stack>
                                </Accordion.Panel>
                              </Accordion.Item>
                            ))}
                          </Accordion>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                  )}
                  
                  {/* 本地文件列表 */}
                  {files.length > 0 && (
                    <Paper withBorder p="xs" radius="xs">
                      <Text size="xs" fw={700} mb="xs">本地文件 ({files.length})</Text>
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                        {files.map((file, index) => (
                          <Paper key={`file-${index}`} withBorder p="xs" radius="xs" bg="gray.0">
                            <Group justify="space-between" wrap="nowrap">
                              <Group gap="xs" wrap="nowrap" style={{ overflow: 'hidden' }}>
                                <Badge size="xs" color="gray">文件</Badge>
                                <Text size="xs" truncate fw={500}>{file.name}</Text>
                              </Group>
                              <ActionIcon size="xs" color="red" variant="subtle" onClick={() => removeFile(index)}>
                                <IconX size={14} />
                              </ActionIcon>
                            </Group>
                          </Paper>
                        ))}
                      </SimpleGrid>
                    </Paper>
                  )}
                </Stack>
              )}
            </Stack>

          <Divider label="分发策略" labelPosition="center" />

          {/* ... existing channels checkbox ... */}
          <Stack gap="xs">
            <Text size="sm" fw={600}>价格同步渠道</Text>
            <Checkbox.Group value={selectedChannels} onChange={setSelectedChannels}>
              <Group gap="md" mt="xs">
                {channels.map((ch) => (
                  <Checkbox
                    key={ch.code}
                    value={ch.code}
                    label={ch.name}
                    disabled={ch.code === 'meituan'}
                    color="orange"
                    size="xs"
                  />
                ))}
              </Group>
            </Checkbox.Group>
            <Text size="xs" c="green.8" fw={500}>* 库存 (Stock) 默认全量物理同步</Text>
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
              fullWidth={isExtension}
            >
              同步已选数据
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Modal
        opened={confirmModalOpened}
        onClose={() => setConfirmModalOpened(false)}
        title="确认采集分类 / Confirm Categories"
        centered
        radius="md"
        padding="md"
        size="md"
      >
        <Stack gap="md">
          <Alert color="blue" icon={<IconInfoCircle size={16} />} p="xs">
            <Text size="xs">已智能过滤无效标签，请勾选您需要同步的商品分类：</Text>
          </Alert>
          
          <ScrollArea.Autosize mah={300} type="always">
            <Checkbox.Group value={selectedCategories} onChange={setSelectedCategories}>
              <Stack gap="xs">
                {detectedCategories.map((cat) => (
                  <Paper key={cat} withBorder p="xs" radius="xs" bg="gray.0">
                    <Checkbox
                      value={cat}
                      label={cat}
                      color="orange"
                      size="sm"
                    />
                  </Paper>
                ))}
              </Stack>
            </Checkbox.Group>
          </ScrollArea.Autosize>

          <Divider />

          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setConfirmModalOpened(false)}>
              取消
            </Button>
            <Button color="orange" onClick={handleConfirmExecute}>
              开始抓取所选数据 ({selectedCategories.length})
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="同步结果汇总"
        centered
        radius="md"
        padding="xl"
      >
        {/* ... existing modal content ... */}
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
