const { query } = require('../../../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Ẩn + chuẩn hoá field trả về cho app
function pickAccountFields(row) {
  const hasAssign = !!(row?.id_lop || row?.id_nhom_hoc);
  return {
    id_tai_khoan: row.id_tai_khoan,
    ten_tai_khoan: row.ten_tai_khoan,
    active: row.active,
    id_nhan_vien: row.id_nhan_vien,
    id_nv: row.id_nv,            // tiện cho FE (nếu cần)
    ho_ten: row.ho_ten,

    // === Phân công hiện hành ===
    id_nhom_hoc: row.id_nhom_hoc || null,
    ten_nhom_hoc: row.ten_nhom_hoc || null,
    id_lop: row.id_lop || null,
    ten_lop: row.ten_lop || null,
    has_assignment: hasAssign,

    ngay_cap: row.ngay_cap,
    loai_tai_khoan: row.loai_tai_khoan,
    code: row.code,
    token: row.token,
  };
}

/** So khớp mật khẩu: hỗ trợ cả bcrypt và plaintext */
async function matchPassword(input, stored) {
  if (!stored) return false;
  const isBcrypt =
    stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$');
  if (isBcrypt) {
    try { return await bcrypt.compare(input, stored); }
    catch { return false; }
  }
  return input === stored; // plaintext
}

function randomString(length) {
  return crypto.randomBytes(length)
    .toString('base64').replace(/[+/=]/g, '').slice(0, length);
}

// Câu SELECT chung: lấy phân công hiện hành (pc.val = 1) → nhóm → lớp
const BASE_SELECT = `
  SELECT
    tk.*,
    nv.id_nv, nv.ho_ten,
    nh.id_nhom_hoc, nh.ten_nhom_hoc,
    lh.id_lop, lh.ten_lop,
    tk.ten_tai_khoan
  FROM taikhoan tk
  LEFT JOIN nhanvien nv
    ON tk.id_nhan_vien = nv.id_nv
  LEFT JOIN phancong pc
    ON pc.id_nv = nv.id_nv AND pc.val = 1
  LEFT JOIN nhomhoc nh
    ON nh.id_nhom_hoc = pc.id_nhom_hoc
  LEFT JOIN lophoc lh
    ON lh.id_lop = nh.id_lop
`;

/** POST /api/auth/login-code { code } */
const loginByCode = async (req, res) => {
  try {
    const { code, info_device } = req.body || {};
    if (!code || typeof code !== 'string' || code.length !== 4) {
      return res.status(400).json({ ok: false, message: 'code không hợp lệ (4 ký tự)' });
    }
    const device = info_device || 'unknown';

    const rows = await query(
      `${BASE_SELECT}
       WHERE tk.code = ? AND tk.active = 1 AND tk.loai_tai_khoan = ?
       LIMIT 1`,
      [code, 2]
    );
    if (!rows || rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Sai mã hoặc tài khoản bị khóa' });
    }

    const user = rows[0];
    const token = randomString(12);
    await query(`UPDATE taikhoan SET token = ? WHERE id_tai_khoan = ?`, [token, user.id_tai_khoan]);

    // Re-select để chắc chắn có token mới (nếu bạn muốn trả token trong account)
    const rows2 = await query(
      `${BASE_SELECT}
       WHERE tk.id_tai_khoan = ?
       LIMIT 1`,
      [user.id_tai_khoan]
    );
    const user2 = rows2[0];

    // Ghi log đăng nhập (không dùng biến username ở scope khác)
    if (user2?.id_nv) {
      const openRows = await query(
        `SELECT id_msg FROM msg_login_staff
          WHERE id_nv = ? AND info_device = ? AND time_out IS NULL
          ORDER BY time_in DESC LIMIT 1`,
        [user2.id_nv, device]
      );
      if (openRows.length === 0) {
        await query(
          `INSERT INTO msg_login_staff
            (id_nv, ten_nv, ten_lop, ten_tai_khoan, time_in, time_out, info_device, state_msg)
           VALUES (?, ?, ?, ?, NOW(), NULL, ?, 'Login App')`,
          [user2.id_nv, user2.ho_ten || null, user2.ten_lop || null, user2.ten_tai_khoan || null, device]
        );
      }
    }

    return res.status(200).json({ ok: true, account: pickAccountFields(user2) });
  } catch (err) {
    console.error('[loginByCode] error:', err);
    return res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
};

/** POST /api/auth/login-userpass { username, password } */
const loginByUserPass = async (req, res) => {
  try {
    const { username, password, info_device } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, message: 'Thiếu username hoặc password' });
    }
    const device = info_device || 'unknown';

    // 1) Lấy user theo username (KHÔNG lọc theo mật khẩu ở WHERE để hỗ trợ bcrypt)
    const rows = await query(
      `${BASE_SELECT}
       WHERE tk.ten_tai_khoan = ? AND tk.active = 1 AND tk.loai_tai_khoan = ?
       LIMIT 1`,
      [username, 2]
    );
    if (!rows || rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Sai tài khoản hoặc mật khẩu' });
    }

    const user = rows[0];
    const ok = await matchPassword(password, user.mat_khau);
    if (!ok) {
      return res.status(401).json({ ok: false, message: 'Sai tài khoản hoặc mật khẩu' });
    }

    // 2) Cập nhật token
    const token = randomString(12);
    await query(`UPDATE taikhoan SET token = ? WHERE id_tai_khoan = ?`, [token, user.id_tai_khoan]);

    // 3) Re-select theo id để trả đầy đủ field + token mới
    const rows2 = await query(
      `${BASE_SELECT}
       WHERE tk.id_tai_khoan = ?
       LIMIT 1`,
      [user.id_tai_khoan]
    );
    const user2 = rows2[0];

    // 4) Ghi log đăng nhập
    if (user2?.id_nv) {
      const openRows = await query(
        `SELECT id_msg FROM msg_login_staff
          WHERE id_nv = ? AND info_device = ? AND time_out IS NULL
          ORDER BY time_in DESC LIMIT 1`,
        [user2.id_nv, device]
      );
      if (openRows.length === 0) {
        await query(
          `INSERT INTO msg_login_staff
            (id_nv, ten_nv, ten_lop, ten_tai_khoan, time_in, time_out, info_device, state_msg)
           VALUES (?, ?, ?, ?, NOW(), NULL, ?, 'Login App')`,
          [user2.id_nv, user2.ho_ten || null, user2.ten_lop || null, user2.ten_tai_khoan || username, device]
        );
      }
    }

    return res.json({ ok: true, account: pickAccountFields(user2) });
  } catch (err) {
    console.error('[loginByUserPass] error:', err);
    return res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
};

const changePasswordByIdNv = async (req, res) => {
  try {
    const { id_nv, old_pass, new_pass } = req.body || {};
    if (!id_nv || !old_pass || !new_pass) {
      return res.status(400).json({ ok: false, message: 'Thiếu tham số' });
    }
    if (String(new_pass).length < 6 || String(new_pass).length > 30) {
      return res.status(400).json({ ok: false, message: 'Mật khẩu mới phải từ 6–30 ký tự' });
    }
    if (old_pass === new_pass) {
      return res.status(400).json({ ok: false, message: 'Mật khẩu mới phải khác mật khẩu cũ' });
    }

    // Lấy tài khoản theo id_nv (loai_tai_khoan=2, active=1)
    const rows = await query(
      `SELECT id_tai_khoan, mat_khau
         FROM taikhoan
        WHERE id_nhan_vien = ? AND loai_tai_khoan = 2 AND active = 1
        LIMIT 1`,
      [id_nv]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy tài khoản' });
    }

    const acc = rows[0];

    // So khớp PLAIN TEXT
    if (String(old_pass) !== String(acc.mat_khau)) {
      return res.status(401).json({ ok: false, message: 'Mật khẩu cũ không đúng' });
    }

    // Cập nhật PLAIN TEXT
    await query(
      `UPDATE taikhoan SET mat_khau = ? WHERE id_tai_khoan = ?`,
      [String(new_pass), acc.id_tai_khoan]
    );

    // (tuỳ chọn) buộc đăng nhập lại:
    // await query(`UPDATE taikhoan SET token = NULL WHERE id_tai_khoan = ?`, [acc.id_tai_khoan]);

    return res.json({ ok: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('[changePasswordByIdNv] error:', err);
    return res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
};

module.exports = { loginByCode, loginByUserPass, changePasswordByIdNv };
