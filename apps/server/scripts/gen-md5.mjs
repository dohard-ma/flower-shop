import crypto from 'crypto';

// 在这里输入你想设置的明文密码
const password = '111111';

const md5 = crypto.createHash('md5').update(password).digest('hex');

console.log('----------------------------');
console.log('明文密码:', password);
console.log('MD5 加密值:', md5);
console.log('----------------------------');
console.log('请将上方 MD5 加密值手动填入数据库 User 表的 password 字段中。');