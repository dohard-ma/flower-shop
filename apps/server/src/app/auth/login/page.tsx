'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Text,
  Container,
  Button,
  Stack,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { http } from '@/lib/request';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await http.post('/api/admin/auth/login', {
        username,
        password
      });
      if (response.success) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请检查账号和密码');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', backgroundColor: 'var(--mantine-color-gray-0)' }}>
      <Container size={420}>
        <Title ta="center" fw={900}>
          管理员登录
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          请输入您的账号和密码进行登录
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput
                label="账号"
                placeholder="请输入账号"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
              <PasswordInput
                label="密码"
                placeholder="请输入密码"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />

              {error && (
                <Alert variant="light" color="red" title="登录失败" icon={<IconAlertCircle />}>
                  {error}
                </Alert>
              )}

              <Button fullWidth mt="xl" type="submit" loading={isLoading}>
                登录
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </div>
  );
}
