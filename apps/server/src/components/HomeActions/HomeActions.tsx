'use client';

import { Button, Group } from '@mantine/core';
import Link from 'next/link';

export function HomeActions() {
    return (
        <Group>
            <Button component={Link} href="/products" size="lg">
                进入商品管理
            </Button>
        </Group>
    );
}

