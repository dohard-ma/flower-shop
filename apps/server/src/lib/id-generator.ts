import Hashids from 'hashids';
import prisma from './prisma';

const salt = process.env.HASHIDS_SALT || 'flower-shop-salt';
const hashids = new Hashids(salt, 6);

export enum IdType {
  USER = 'U',
  PRODUCT = 'P',
  ORDER = 'O',
}

export async function generateDisplayId(storeCode: string, type: IdType): Promise<string> {
  // 1. 原子领号：在 SystemSequence 插入记录获取自增 ID
  const sequence = await prisma.systemSequence.create({
    data: {}
  });

  // 2. 混淆转换
  const hash = hashids.encode(sequence.id);

  // 3. 拼接最终编号: {Store.code}{TypePrefix}{Hashids}
  // 注意：文档中说 {Store.code} + {TypePrefix} + - + {Hashids}
  // 但示例中 Store.code 是 H, TypePrefix 是 U, 所以可能是 HU-XXXXXX
  return `${storeCode}${type}-${hash}`;
}

