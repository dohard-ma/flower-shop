import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 解析 products.sql 文件并生成 JSON 数据
 */
function parseSql() {
  const sqlPath = path.resolve(__dirname, '../../../products.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  // 匹配 INSERT INTO `products` VALUES (...);
  const regex = /INSERT INTO `products` VALUES \((.*)\);/g;
  const products = [];
  let match;

  while ((match = regex.exec(sqlContent)) !== null) {
    const valuesStr = match[1];
    // 简单的逗号分割会有问题，因为 JSON 字段里也有逗号
    // 这里使用一个稍微复杂点的逻辑：按逗号分割，但忽略引号内的逗号
    const values = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      if ((char === "'" || char === '"') && valuesStr[i - 1] !== '\\') {
        if (!inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuote = false;
        }
        current += char;
      } else if (char === ',' && !inQuote) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    // 清理并转换数据
    const clean = (val) => {
      if (val === 'NULL') return null;
      if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
      return val;
    };

    products.push({
      id: clean(values[0]),
      name: clean(values[1]),
      category: clean(values[2]),
      images: clean(values[3]),
      videos: clean(values[4]),
      priceRef: clean(values[5]),
      materials: clean(values[6]),
      status: clean(values[7]),
      description: clean(values[8]),
      sortOrder: parseInt(clean(values[9])),
      createdAt: clean(values[10]),
      updatedAt: clean(values[11]),
      stock: clean(values[12]),
      storeCode: clean(values[13]),
      style: clean(values[14]),
      branchCount: clean(values[15]),
      size: clean(values[16]),
      remark: clean(values[17]),
      targetAudience: clean(values[18]),
      colorSeries: clean(values[19])
    });
  }

  const outputPath = path.resolve(__dirname, '../prisma/seeds/old-products.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
  console.log(`✅ 解析完成，共 ${products.length} 个商品，已保存至 ${outputPath}`);
}

parseSql();

