'use client';

import { useState, useEffect, useRef, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Center,
  Loader,
  SegmentedControl,
  Box,
} from '@mantine/core';
import { IconAlertCircle, IconQrcode, IconLock } from '@tabler/icons-react';
import { http } from '@/lib/request';
import Image from 'next/image';

// 简单的 Cookie 操作工具
const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

function LoginContent() {
  const [loginMode, setLoginMode] = useState<'qrcode' | 'password'>('qrcode');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [status, setStatus] = useState<'PENDING' | 'SCANNED' | 'CONFIRMED' | 'EXPIRED' | 'ERROR'>('PENDING');
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const storeCode = searchParams.get('store');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const loginModeRef = useRef(loginMode);

  // 检查是否已经登录
  useEffect(() => {
    const token = getCookie('session_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    loginModeRef.current = loginMode;
  }, [loginMode]);

  // 获取二维码
  const fetchQrCode = async () => {
    if (loginModeRef.current !== 'qrcode') return;

    try {
      setStatus('PENDING');
      setError(null);

      // storeCode 可以为空，后端会处理默认值
      const res = await http.post('/api/admin/auth/ticket', { storeCode });

      // 如果切换了模式，就不更新状态了
      if (loginModeRef.current !== 'qrcode') return;

      setQrCode(res.data.qrCode);
      setTicketId(res.data.ticketId);
      startPolling(res.data.ticketId);
    } catch (err: any) {
      if (loginModeRef.current !== 'qrcode') return;
      setError(err.message || '获取二维码失败');
      setStatus('ERROR');
    }
  };

  // 开始轮询
  const startPolling = (id: string) => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(async () => {
      try {
        const res = await http.get(`/api/admin/auth/ticket/${id}`, { showError: false });
        const newStatus = res.data.status;

        if (newStatus !== status) {
          setStatus(newStatus);
        }

        if (newStatus === 'CONFIRMED' && res.data.token) {
          if (timerRef.current) clearInterval(timerRef.current);

          // 重要：手动设置 Cookie
          setCookie('session_token', res.data.token, 1);

          router.push('/dashboard');
        } else if (newStatus === 'EXPIRED') {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (err) {
        console.error('轮询失败:', err);
      }
    }, 2000);
  };

  useEffect(() => {
    if (loginMode === 'qrcode') {
      fetchQrCode();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loginMode, storeCode]);

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await http.post('/api/admin/auth/login', {
        username, // 这里的 username 映射到后端的 displayId
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
          {storeCode ? `正在登录店铺: ${storeCode}` : '请扫描下方小程序码登录'}
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Stack>
            <SegmentedControl
              value={loginMode}
              onChange={(value: any) => setLoginMode(value)}
              data={[
                {
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconQrcode size={16} />
                      <span>扫码登录</span>
                    </Center>
                  ),
                  value: 'qrcode'
                },
                {
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconLock size={16} />
                      <span>密码登录</span>
                    </Center>
                  ),
                  value: 'password'
                },
              ]}
            />

            {loginMode === 'qrcode' ? (
              <Box mt="md">
                <Center>
                  {status === 'PENDING' && !qrCode && <Loader size="xl" />}
                  {qrCode && (
                    <Box pos="relative" style={{ border: '1px solid #eee', padding: 10, borderRadius: 8 }}>
                      <Image
                        src={qrCode}
                        alt="Login QR Code"
                        width={240}
                        height={240}
                        style={{
                          filter: (status === 'EXPIRED' || status === 'CONFIRMED') ? 'blur(4px)' : 'none',
                          opacity: (status === 'EXPIRED' || status === 'CONFIRMED') ? 0.5 : 1,
                          display: 'block'
                        }}
                      />
                      {status === 'EXPIRED' && (
                        <Center pos="absolute" inset={0} bg="rgba(255,255,255,0.7)" style={{ borderRadius: 8 }}>
                          <Stack gap="xs" align="center">
                            <Text fw={700}>二维码已过期</Text>
                            <Button variant="filled" size="sm" onClick={fetchQrCode}>点击刷新</Button>
                          </Stack>
                        </Center>
                      )}
                      {status === 'CONFIRMED' && (
                        <Center pos="absolute" inset={0} bg="rgba(255,255,255,0.7)" style={{ borderRadius: 8 }}>
                          <Stack gap="xs" align="center">
                            <Text fw={700} c="green">登录成功</Text>
                            <Text size="xs">正在跳转...</Text>
                          </Stack>
                        </Center>
                      )}
                      {status === 'SCANNED' && (
                        <Center pos="absolute" inset={0} bg="rgba(255,255,255,0.7)" style={{ borderRadius: 8 }}>
                          <Stack gap="xs" align="center">
                            <Text fw={700}>已扫码</Text>
                            <Text size="xs">请在手机端确认登录</Text>
                          </Stack>
                        </Center>
                      )}
                    </Box>
                  )}
                </Center>
                <Text size="sm" ta="center" mt="md" c="dimmed">
                  请使用该店铺关联的小程序扫码
                </Text>
              </Box>
            ) : (
              <form onSubmit={handlePasswordSubmit}>
            <Stack>
              <TextInput
                label="管理员编号"
                placeholder="请输入您的管理员编号 (如: H-1001)"
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
              <Button fullWidth mt="md" type="submit" loading={isLoading}>
                登录
              </Button>
            </Stack>
              </form>
            )}

            {error && (
              <Alert variant="light" color="red" title="登录失败" icon={<IconAlertCircle />}>
                {error}
              </Alert>
            )}
          </Stack>
        </Paper>
      </Container>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Center style={{ height: '100vh' }}><Loader /></Center>}>
      <LoginContent />
    </Suspense>
  );
}
