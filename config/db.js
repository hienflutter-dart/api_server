const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "api_kdkids",
  connectionLimit: 10,
  dateStrings: true,
  timezone: "+07:00",
});

// ✅ MySQL2/promise đã hỗ trợ async/await sẵn
async function query(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// ==========================
// ✅ Hàm lưu khuôn mặt vào DB
// ==========================
async function saveFaceToDB({ name, id_nv, descriptor, image }) {
  const sql = `
    INSERT INTO image_nv (ho_ten, descriptor, image_base64, id_nv, ngay_tao)
    VALUES (?, ?, ?, ?, NOW())
  `;
  await query(sql, [name, JSON.stringify(descriptor), image, id_nv]);
}

// ============================
// ✅ Hàm tải danh sách khuôn mặt
// ============================
async function loadFacesFromDB() {
  try {
    const sql = `SELECT id, ho_ten, descriptor, image_base64 FROM image_nv`;
    const rows = await query(sql);

    return rows.map(row => ({
      id: row.id,
      name: row.ho_ten,
      image: row.image_base64,
      descriptor: JSON.parse(row.descriptor)
    }));
  } catch (err) {
    console.error("❌ Lỗi khi tải danh sách khuôn mặt:", err);
    throw err;
  }
}

module.exports = { pool, query, saveFaceToDB, loadFacesFromDB };
