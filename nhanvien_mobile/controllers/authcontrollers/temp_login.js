const { query } = require('../../../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Ẩn các field nhạy cảm
function pickAccountFields(row) {
  return {
    id_tai_khoan: row.id_tai_khoan,
    ten_tai_khoan: row.ten_tai_khoan,
    active: row.active,
    id_nhan_vien: row.id_nhan_vien,
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
  // plaintext
  return input === stored;
}

function randomString(length) {
  return crypto
    .randomBytes(length)
    .toString("base64") // base64_encode
    .replace(/[+/=]/g, "") // bỏ + / =
    .slice(0, length); // cắt đúng độ dài
}

/** POST /api/auth/login-code { code } */
const loginByCode = async (req, res) => {
  try {
    const { code, info_device } = req.body || {};
    if (!code || typeof code !== "string" || code.length !== 4) {
      return res
        .status(400)
        .json({ ok: false, message: "code không hợp lệ (4 ký tự)" });
    }

    const device = info_device || "unknown";

    const rows = await query(
      `SELECT 
        tk.*, 
        nv.id_nv, nv.ho_ten, 
        lh.ten_lop,
        tk.ten_tai_khoan
      FROM (((taikhoan tk
        LEFT JOIN nhanvien nv ON tk.id_nhan_vien = nv.id_nv)
        LEFT JOIN phancong pc ON pc.id_nv = nv.id_nv)
        LEFT JOIN nhomhoc nh ON nh.id_nhom_hoc = pc.id_nhom_hoc)
        LEFT JOIN lophoc lh ON lh.id_lop = nh.id_lop
      WHERE tk.code = ?
        AND tk.active = 1
        AND tk.loai_tai_khoan = ?
      LIMIT 1`,
      [code, 2]
    );

    if (!rows || rows.length === 0) {
      return res
        .status(401)
        .json({ ok: false, message: "Sai mã hoặc tài khoản bị khóa" });
    }

    const user = rows[0];

    const token = randomString(12);

    const upd = await query(
      `UPDATE taikhoan SET token = ? WHERE id_tai_khoan = ?`,
      [token, user.id_tai_khoan]
    );

    if (!upd || upd.affectedRows === 0) {
      console.error("token-empty");
    }

    const rows2 = await query(
      `SELECT 
        tk.*, 
        nv.id_nv, nv.ho_ten, 
        lh.ten_lop,
        tk.ten_tai_khoan
      FROM (((taikhoan tk
        LEFT JOIN nhanvien nv ON tk.id_nhan_vien = nv.id_nv)
        LEFT JOIN phancong pc ON pc.id_nv = nv.id_nv)
        LEFT JOIN nhomhoc nh ON nh.id_nhom_hoc = pc.id_nhom_hoc)
        LEFT JOIN lophoc lh ON lh.id_lop = nh.id_lop
      WHERE tk.code = ?
        AND tk.active = 1
        AND tk.loai_tai_khoan = ?
      LIMIT 1`,
      [code, 2]
    );

    const user2 = rows2[0];

    let id_msg = null;

    if (user2?.id_nv) {
      const openRows = await query(
        `SELECT id_msg 
           FROM msg_login_staff 
          WHERE id_nv = ? AND info_device = ? AND time_out IS NULL
          ORDER BY time_in DESC
          LIMIT 1`,
        [user2.id_nv, device]
      );

      if (openRows.length > 0) {
        id_msg = openRows[0].id_msg;
      } else {
        const ins = await query(
          `INSERT INTO msg_login_staff
            (id_nv, ten_nv, ten_lop, ten_tai_khoan, time_in, time_out, info_device, state_msg)
           VALUES (?, ?, ?, ?, NOW(), NULL, ?, 'Login App')`,
          [
            user2.id_nv,
            user2.ho_ten || null,
            user2.ten_lop || null,
            user2.ten_tai_khoan || username,
            device,
          ]
        );
        id_msg = ins.insertId;
      }
    }

    console.log("[loginByCode] success:", rows2[0]);

    return res.status(200).json({ ok: true, account: pickAccountFields(user2) });
  } catch (err) {
    console.error("[loginByCode] error:", err);
    return res.status(500).json({ ok: false, message: "Lỗi server" });
  }
};

/** POST /api/auth/login-userpass { username, password } */
const loginByUserPass = async (req, res, next) => {
  console.log("[loginByUserPass]", req.body?.username);
  try {
    const { username, password, info_device } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ ok: false, message: "Thiếu username hoặc password" });
    }

    const device = info_device || "unknown";

    const rows = await query(
      `SELECT 
        tk.*, 
        nv.id_nv, nv.ho_ten, 
        lh.ten_lop,
        tk.ten_tai_khoan
      FROM (((taikhoan tk
        LEFT JOIN nhanvien nv ON tk.id_nhan_vien = nv.id_nv)
        LEFT JOIN phancong pc ON pc.id_nv = nv.id_nv)
        LEFT JOIN nhomhoc nh ON nh.id_nhom_hoc = pc.id_nhom_hoc)
        LEFT JOIN lophoc lh ON lh.id_lop = nh.id_lop
      WHERE tk.ten_tai_khoan = ? 
        AND tk.mat_khau = ?
        AND tk.active = 1
        AND tk.loai_tai_khoan = ?
      LIMIT 1`,
      [username, password, 2]
    );

    if (!rows || rows.length === 0) {
      return res
        .status(401)
        .json({ ok: false, message: "Sai tài khoản hoặc mật khẩu" });
    }

    const user = rows[0];
    if (Number(user.active) !== 1) {
      return res
        .status(401)
        .json({ ok: false, message: "Tài khoản đang bị khóa" });
    }

    const ok = await matchPassword(password, user.mat_khau);
    if (!ok) {
      return res
        .status(401)
        .json({ ok: false, message: "Sai tài khoản hoặc mật khẩu" });
    }

    const token = randomString(12);

    const upd = await query(
      `UPDATE taikhoan SET token = ? WHERE id_tai_khoan = ?`,
      [token, user.id_tai_khoan]
    );

    if (!upd || upd.affectedRows === 0) {
      console.error("token-empty");
    }

    const row2 = await query(
      `SELECT 
        tk.*, 
        nv.id_nv, nv.ho_ten, 
        lh.ten_lop,
        tk.ten_tai_khoan
      FROM (((taikhoan tk
        LEFT JOIN nhanvien nv ON tk.id_nhan_vien = nv.id_nv)
        LEFT JOIN phancong pc ON pc.id_nv = nv.id_nv)
        LEFT JOIN nhomhoc nh ON nh.id_nhom_hoc = pc.id_nhom_hoc)
        LEFT JOIN lophoc lh ON lh.id_lop = nh.id_lop
      WHERE tk.ten_tai_khoan = ? 
        AND tk.mat_khau = ?
        AND tk.active = 1
        AND tk.loai_tai_khoan = ?
      LIMIT 1`,
      [username, password, 2]
    );

    const user2 = row2[0];

    let id_msg = null;

    if (user2?.id_nv) {
      const openRows = await query(
        `SELECT id_msg 
           FROM msg_login_staff 
          WHERE id_nv = ? AND info_device = ? AND time_out IS NULL
          ORDER BY time_in DESC
          LIMIT 1`,
        [user2.id_nv, device]
      );

      if (openRows.length > 0) {
        id_msg = openRows[0].id_msg;
      } else {
        const ins = await query(
          `INSERT INTO msg_login_staff
            (id_nv, ten_nv, ten_lop, ten_tai_khoan, time_in, time_out, info_device, state_msg)
           VALUES (?, ?, ?, ?, NOW(), NULL, ?, 'Login App')`,
          [
            user2.id_nv,
            user2.ho_ten || null,
            user2.ten_lop || null,
            user2.ten_tai_khoan || username,
            device,
          ]
        );
        id_msg = ins.insertId;
      }
    }

    return res.json({ ok: true, account: pickAccountFields(user2) });
  } catch (err) {
    console.error("[loginByUserPass] error:", err);
    return res.status(500).json({ ok: false, message: "Lỗi server" });
  }
};


module.exports = { loginByCode, loginByUserPass };
