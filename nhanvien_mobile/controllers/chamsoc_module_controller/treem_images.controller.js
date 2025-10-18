/// nhanvien_mobile/controllers/chamsoc_module_controller/treem_images.controller.js
const { query }  = require('../../../config/db');

/**
 * Lấy tất cả ảnh
 */
const getTreemImages = async (req, res) => {
  console.log("[getTreemImages] Fetching all images");
  try {
    const sql = `SELECT * FROM treem_images`;
    const rows = await query(sql);
    if (rows.length === 0) {
      console.info("[getTreemImages] No images found");
      return res.status(404).send("Không có ảnh nào");
    }
    return res.json(rows);
  } catch (err) {
    console.error("[getTreemImages] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn ảnh");
  }
};

/**
 * Lấy ảnh theo ID ảnh
 */
const getTreemImageById = async (req, res) => {
  const { id_img } = req.params;
  console.log(`[getTreemImageById] Fetching image ID=${id_img}`);
  if (!Number.isInteger(Number(id_img))) {
    return res.status(400).send("ID ảnh không hợp lệ");
  }
  try {
    const sql = `SELECT * FROM treem_images WHERE id_img = ?`;
    const rows = await query(sql, [id_img]);
    if (rows.length === 0) {
      return res.status(404).send("Không tìm thấy ảnh");
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("[getTreemImageById] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn ảnh");
  }
};

/**
 * Lấy ảnh theo ID trẻ em
 */
const getImagesByTreEm = async (req, res) => {
  const { id_tre_em } = req.params;
  console.log(`[getImagesByTreEm] Fetching images for child ID=${id_tre_em}`);
  if (!Number.isInteger(Number(id_tre_em))) {
    return res.status(400).send("ID trẻ em không hợp lệ");
  }
  try {
    const sql = `SELECT * FROM treem_images WHERE id_tre_em = ?`;
    const rows = await query(sql, [id_tre_em]);
    if (rows.length === 0) {
      return res.status(404).send("Không có ảnh cho trẻ em này");
    }
    return res.json(rows);
  } catch (err) {
    console.error("[getImagesByTreEm] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn ảnh");
  }
};

/**
 * Create a new image record
 */
const insertTreemImage = async (req, res) => {
  console.log("[insertTreemImage] Creating new image record", req.body);
  try {
    const { id_tre_em, img_1, img_2, img_3, img_4, ghi_chu } = req.body;

    if (!Number.isInteger(Number(id_tre_em))) {
      console.warn("[insertTreemImage] Missing or invalid child ID");
      return res.status(400).send("Thiếu hoặc ID trẻ em không hợp lệ");
    }

    const sql = `INSERT INTO treem_images (
        id_img, id_tre_em, img_1, img_2, img_3, img_4, ghi_chu
      ) VALUES (NULL, ?, ?, ?, ?, ?, ?)`;
    const params = [
      id_tre_em,
      img_1 || null,
      img_2 || null,
      img_3 || null,
      img_4 || null,
      ghi_chu || null
    ];
    const result = await query(sql, params);
    console.log(`[insertTreemImage] Inserted image record with ID=${result.insertId}`);
    return res.status(201).json({ id_img: result.insertId });
  } catch (err) {
    console.error("[insertTreemImage] Error inserting image:", err);
    return res.status(500).send("Lỗi khi thêm ảnh");
  }
};

/**
 * Update an existing image record
 */
const updateTreemImage = async (req, res) => {
  const { id_img } = req.params;
  console.log(`[updateTreemImage] Updating image ID=${id_img}`, req.body);

  if (!Number.isInteger(Number(id_img))) {
    console.warn(`[updateTreemImage] Invalid image ID: ${id_img}`);
    return res.status(400).send("ID ảnh không hợp lệ");
  }

  try {
    const { img_1, img_2, img_3, img_4, ghi_chu } = req.body;
    const sql = `UPDATE treem_images SET
        img_1 = ?, img_2 = ?, img_3 = ?, img_4 = ?, ghi_chu = ?
      WHERE id_img = ?`;
    const params = [
      img_1 || null,
      img_2 || null,
      img_3 || null,
      img_4 || null,
      ghi_chu || null,
      id_img
    ];
    const result = await query(sql, params);
    if (result.affectedRows === 0) {
      console.info(`[updateTreemImage] No image found for ID=${id_img}`);
      return res.status(404).send("Không tìm thấy ảnh");
    }
    console.log(`[updateTreemImage] Updated image ID=${id_img}`);
    return res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    console.error("[updateTreemImage] Error updating image:", err);
    return res.status(500).send("Lỗi khi cập nhật ảnh");
  }
};

/**
 * Delete an image record
 */
const deleteTreemImage = async (req, res) => {
  const { id_img } = req.params;
  console.log(`[deleteTreemImage] Deleting image ID=${id_img}`);

  if (!Number.isInteger(Number(id_img))) {
    console.warn(`[deleteTreemImage] Invalid image ID: ${id_img}`);
    return res.status(400).send("ID ảnh không hợp lệ");
  }

  try {
    const sql = `DELETE FROM treem_images WHERE id_img = ?`;
    const result = await query(sql, [id_img]);
    if (result.affectedRows === 0) {
      console.info(`[deleteTreemImage] No image found for ID=${id_img}`);
      return res.status(404).send("Không tìm thấy ảnh");
    }
    console.log(`[deleteTreemImage] Deleted image ID=${id_img}`);
    return res.json({ message: "Xóa thành công" });
  } catch (err) {
    console.error("[deleteTreemImage] Error deleting image:", err);
    return res.status(500).send("Lỗi khi xóa ảnh");
  }
};

module.exports = {
  getTreemImages,
  getImagesByTreEm,
  getTreemImageById,
  insertTreemImage,
  updateTreemImage,
  deleteTreemImage
};