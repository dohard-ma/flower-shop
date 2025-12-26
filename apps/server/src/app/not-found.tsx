'use client';

import { useRouter } from 'next/navigation';
import { Title, Text, Button, Container, Group, Stack } from '@mantine/core';

export default function NotFound() {
  const router = useRouter();

  return (
    <Container style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack align="center" gap="lg">
        <Text
          size="10rem"
          fw={900}
          variant="gradient"
          gradient={{ from: 'gray.4', to: 'gray.0', deg: 180 }}
          style={{ lineHeight: 1 }}
        >
          404
        </Text>
        <Title order={2} ta="center">页面不存在</Title>
        <Text c="dimmed" size="lg" ta="center" maw={500}>
          抱歉，您访问的页面不存在或已被移动。
        </Text>
        <Group justify="center" mt="xl">
          <Button onClick={() => router.back()} variant="default" size="md">
            返回上一页
          </Button>
          <Button onClick={() => router.push('/dashboard')} size="md">
            返回首页
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
