// controllers/msgLogin.controller.js
const { query } = require('../../../config/db');

// Utils
const nowMySQL = () => new Date(); // để client TZ; nếu cần dùng NOW() thì làm tại SQL

// 1) INSERT: tạo bản ghi khi mở/đăng nhập app
// body: { id_phu_huynh, ten_tai_khoan, info_device, state_msg? }
exports.insertMsgLogin = async (req, res) => {
  try {
    const { id_phu_huynh, ten_tai_khoan, info_device, state_msg } = req.body || {};
    if (!ten_tai_khoan) {
      return res.status(400).json({ message: 'Thiếu ten_tai_khoan' });
    }

    const _state = state_msg && String(state_msg).trim() !== ''
      ? String(state_msg).trim()
      : 'Open App'; // mặc định

    const sql = `
      INSERT INTO msg_login
        (id_phu_huynh, ten_tai_khoan, time_in, time_out, info_device, state_msg)
      VALUES (?, ?, ?, NULL, ?, ?)
    `;
    const params = [
      id_phu_huynh ?? null,
      ten_tai_khoan,
      nowMySQL(),
      info_device ?? null,
      _state
    ];

    const result = await query(sql, params);
    return res.json({ id_msg: result.insertId, affectedRows: result.affectedRows });
  } catch (err) {
    console.error('insertMsgLogin error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// 2) UPDATE: cập nhật time_out khi đóng/thoát/đăng xuất app
// body: { id_msg?, ten_tai_khoan?, state_msg?, info_device? }
// Ưu tiên update theo id_msg; nếu không có id_msg thì update "bản ghi mở" gần nhất
exports.updateMsgLogoutOrClose = async (req, res) => {
  try {
    const { id_msg, ten_tai_khoan, state_msg, info_device } = req.body || {};

    // tìm dòng cần update
    let row;
    if (id_msg) {
      const [r] = await query(`SELECT * FROM msg_login WHERE id_msg = ? LIMIT 1`, [id_msg]);
      row = r;
    } else if (ten_tai_khoan) {
      // lấy bản ghi "mở" gần nhất (chưa có time_out)
      const rows = await query(
        `SELECT * FROM msg_login 
         WHERE ten_tai_khoan = ? AND time_out IS NULL 
         ORDER BY time_in DESC LIMIT 1`,
        [ten_tai_khoan]
      );
      row = rows?.[0];
    }

    if (!row) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi để cập nhật' });
    }

    const _state = state_msg && String(state_msg).trim() !== ''
      ? String(state_msg).trim()
      : 'Close App OR Pause App';

    const sql = `
      UPDATE msg_login
      SET time_out = ?, state_msg = ?, info_device = COALESCE(?, info_device)
      WHERE id_msg = ?
    `;
    const params = [nowMySQL(), _state, info_device ?? null, row.id_msg];

    const result = await query(sql, params);
    return res.json({ id_msg: row.id_msg, affectedRows: result.affectedRows });
  } catch (err) {
    console.error('updateMsgLogoutOrClose error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// 3) (Tuỳ chọn) Upsert 1-chạm: nếu đang mở -> cập nhật, nếu chưa có -> insert
// body: { ten_tai_khoan, id_phu_huynh?, info_device?, action } // action: 'open' | 'login' | 'close' | 'logout'
exports.trackMsgLogin = async (req, res) => {
  try {
    const { ten_tai_khoan, id_phu_huynh, info_device, action } = req.body || {};
    if (!ten_tai_khoan) return res.status(400).json({ message: 'Thiếu ten_tai_khoan' });

    const act = String(action || 'open').toLowerCase();

    if (act === 'open' || act === 'login') {
      const result = await query(
        `INSERT INTO msg_login (id_phu_huynh, ten_tai_khoan, time_in, time_out, info_device, state_msg)
         VALUES (?, ?, ?, NULL, ?, ?)`,
        [id_phu_huynh ?? null, ten_tai_khoan, nowMySQL(), info_device ?? null, act === 'login' ? 'Login App' : 'Open App']
      );
      return res.json({ id_msg: result.insertId, affectedRows: result.affectedRows });
    }

    if (act === 'close' || act === 'logout') {
      const rows = await query(
        `SELECT id_msg FROM msg_login 
         WHERE ten_tai_khoan = ? AND time_out IS NULL 
         ORDER BY time_in DESC LIMIT 1`,
        [ten_tai_khoan]
      );
      const row = rows?.[0];
      if (!row) return res.status(404).json({ message: 'Không có phiên mở để cập nhật' });

      const result = await query(
        `UPDATE msg_login 
         SET time_out = ?, state_msg = ?, info_device = COALESCE(?, info_device)
         WHERE id_msg = ?`,
        [nowMySQL(), act === 'logout' ? 'Logout App' : 'Close App OR Pause App', info_device ?? null, row.id_msg]
      );
      return res.json({ id_msg: row.id_msg, affectedRows: result.affectedRows });
    }

    return res.status(400).json({ message: 'action không hợp lệ' });
  } catch (err) {
    console.error('trackMsgLogin error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};
