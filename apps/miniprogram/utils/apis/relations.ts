import { request } from './index';

export type Relation = {
    id: number;
    friendUserId: number;
    relationType: number;
    relationTypeName: string;
    remark: string;
    friend: {
        id?: number;
        nickname: string;
        avatar: string;
        name?: string;
        phone?: string;
    };
    giftCount?: number;
    daysSinceLastGift?: number | null;
}

export async function getUserRelations() {
    const res = await request<Relation[]>({
        url: '/relations',
        method: 'GET'
    });

    if (res.success) {
        return res.data || [];
    }

    return [];
}

