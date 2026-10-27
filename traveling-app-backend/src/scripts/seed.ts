import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

const runSeed = async () => {
  try {
    const seedPath = path.resolve(__dirname, '../../../database/seed.sql');
    console.log(`[Seed Script]: Đang đọc file từ ${seedPath}...`);

    if (!fs.existsSync(seedPath)) {
      throw new Error(`Không tìm thấy file seed.sql tại: ${seedPath}`);
    }

    const sqlContent = fs.readFileSync(seedPath, 'utf8');

    console.log('[Seed Script]: Đang thực thi nạp dữ liệu vào Supabase PostgreSQL...');
    const start = Date.now();
    await pool.query(sqlContent);
    const duration = ((Date.now() - start) / 1000).toFixed(2);

    console.log(`✅ [Seed Thắng Lợi]: Dữ liệu mẫu đã được nạp thành công vào 10 bảng trong ${duration}s!`);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ [Seed Thất Bại]:', error); +
      await pool.end();
    process.exit(1);
  }
};

runSeed();
