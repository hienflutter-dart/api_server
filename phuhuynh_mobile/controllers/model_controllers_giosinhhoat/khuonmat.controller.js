const { pool, saveFaceToDB, loadFacesFromDB } = require('../../../config/db');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const path = require('path');
const { Canvas, Image, ImageData } = canvas;

// Monkey-patch cho face-api
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Load model một lần khi server khởi động
async function loadModels() {
  const modelPath = path.join(__dirname, '../../model');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  console.log('✅ FaceAPI models loaded');
}
loadModels();

exports.registerFace = async (req, res) => {
  try {
    const { name, id_nv, image } = req.body;
    if (!name || !id_nv || !image)
      return res.status(400).json({ error: 'Thiếu dữ liệu' });

    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64, 'base64');
    const img = await canvas.loadImage(imgBuffer);

    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection)
      return res.status(400).json({ error: 'Không phát hiện khuôn mặt' });

    const descriptor = Array.from(detection.descriptor);
    await saveFaceToDB({ name, id_nv, descriptor, image });

    res.json({ message: 'Đăng ký khuôn mặt thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.initAttendance = async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 1️⃣ Tìm kỳ công chứa ngày hiện tại
    const [indexRows] = await pool.execute(`
      SELECT id_index
      FROM indexcount
      WHERE ? >= ngay_bat_dau AND ? <= ngay_ket_thuc
      LIMIT 1
    `, [today, today]);

    if (indexRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Không tìm thấy kỳ công cho ngày ${today}.`
      });
    }

    const id_index = indexRows[0].id_index;

    // 2️⃣ Kiểm tra đã có dữ liệu công hôm nay chưa
    const [checkToday] = await pool.query(`
      SELECT COUNT(*) AS total FROM ccnv
      WHERE DATE(ngay_cc_db) = ? AND id_index = ?
    `, [today, id_index]);

    // 3️⃣ Nếu chưa có → khởi tạo
    if (checkToday[0].total === 0) {
      const startOfDay = `${today} 00:00:00`;
      await pool.execute(`
        INSERT INTO ccnv (id_nv, ho_ten, ngay_cc_db, ngay_cc_cb, he_so_cc, cc_muon, id_index)
        SELECT id_nv, ho_ten, ?, ?, NULL, 0, ?
        FROM nhanvien
        WHERE trang_thai = 1
      `, [startOfDay, startOfDay, id_index]);
      console.log(`[INFO] ✅ Khởi tạo công mặc định cho ${today}`);
      return res.json({ success: true, message: `Đã khởi tạo công cho ${today}` });
    }

    return res.json({ success: true, message: `Công cho ${today} đã tồn tại` });
  } catch (err) {
    console.error('[ERROR:initAttendance]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.recognizeFace = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image)
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu ảnh" });

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const imgBuffer = Buffer.from(base64, "base64");
    const imgCanvas = await canvas.loadImage(imgBuffer);

    const detection = await faceapi
      .detectSingleFace(imgCanvas)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection)
      return res.status(400).json({ success: false, message: "Không phát hiện khuôn mặt" });

    const queryDesc = detection.descriptor;

    // === Lấy danh sách khuôn mặt đang hoạt động ===
    const [rows] = await pool.query(`
      SELECT i.id_nv, i.ho_ten, i.descriptor
      FROM image_nv AS i
      INNER JOIN nhanvien AS n ON i.id_nv = n.id_nv
      WHERE n.trang_thai = 1
    `);

    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Không có dữ liệu khuôn mặt" });

    // === So khớp descriptor ===
    let bestMatch = null;
    let bestDistance = Infinity;
    for (const row of rows) {
      const storedDesc = Float32Array.from(JSON.parse(row.descriptor));
      let sum = 0;
      for (let i = 0; i < storedDesc.length; i++) {
        const diff = storedDesc[i] - queryDesc[i];
        sum += diff * diff;
      }
      const distance = Math.sqrt(sum);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = row;
      }
    }

    const THRESHOLD = 0.45;
    if (bestDistance >= THRESHOLD) {
      return res.json({
        success: false,
        message: "Không khớp với khuôn mặt nào trong hệ thống",
        distance: bestDistance.toFixed(3),
      });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    console.log(`✅ Nhận diện: ${bestMatch.ho_ten} (${bestDistance.toFixed(3)})`);

    // === Lấy kỳ công hiện tại ===
    const [indexRows] = await pool.execute(`
      SELECT id_index 
      FROM indexcount 
      WHERE ? BETWEEN ngay_bat_dau AND ngay_ket_thuc 
      LIMIT 1
    `, [today]);

    if (indexRows.length === 0)
      return res.status(400).json({ success: false, message: "Chưa khởi tạo kỳ công hôm nay" });

    const id_index = indexRows[0].id_index;

    // === Lấy bản ghi công của nhân viên ===
    const [rowsUser] = await pool.query(`
      SELECT * FROM ccnv WHERE id_nv = ? AND id_index = ? AND DATE(ngay_cc_db) = ? LIMIT 1
    `, [bestMatch.id_nv, id_index, today]);

    if (rowsUser.length === 0)
      return res.status(400).json({ success: false, message: "Chưa có dữ liệu công hôm nay" });

    const record = rowsUser[0];
    const hour = now.getHours();
    const minute = now.getMinutes();

    let status = "";
    let message = "";
    let cc_muon = 0;

    // === Giờ vào ===
    if (!record.ngay_cc_db || record.ngay_cc_db.endsWith("00:00:00")) {
      if (hour > 6 || (hour === 6 && minute > 30)) {
        status = "vao_muon";
        cc_muon = 1;
        message = `${bestMatch.ho_ten} đã đến muộn (${hour}:${minute}).`;
      } else {
        status = "vao_thanhcong";
        message = `${bestMatch.ho_ten} đã chấm công vào đúng giờ (${hour}:${minute}).`;
      }

      await pool.execute(
        `UPDATE ccnv SET ngay_cc_db = ?, cc_muon = ? WHERE id_ccnv = ?`,
        [now, cc_muon, record.id_ccnv]
      );

      return res.json({ success: true, ho_ten: bestMatch.ho_ten, status, message });
    }

    // === Giờ ra ===
    if (!record.ngay_cc_cb || record.ngay_cc_cb.endsWith("00:00:00")) {
      if (hour < 16 || (hour === 16 && minute < 30)) {
        status = "ra_som";
        message = `${bestMatch.ho_ten} ra về sớm (${hour}:${minute}).`;
      } else {
        status = "ra_thanhcong";
        message = `${bestMatch.ho_ten} đã ra về đúng giờ (${hour}:${minute}).`;
      }

      await pool.execute(`UPDATE ccnv SET ngay_cc_cb = ? WHERE id_ccnv = ?`, [now, record.id_ccnv]);
    }

    // === Tính lại hệ số công ===
    const start = new Date(record.ngay_cc_db);
    const diffHours = isNaN(start.getTime())
      ? 0
      : Math.round(((now - start) / (1000 * 60 * 60)) * 100) / 100;

    let he_so_cc = 0.0;
    if (diffHours >= 6) he_so_cc = 1.0;
    else if (diffHours >= 3.5) he_so_cc = 0.5;

    await pool.execute(`UPDATE ccnv SET he_so_cc = ? WHERE id_ccnv = ?`, [he_so_cc, record.id_ccnv]);

    res.json({
      success: true,
      ho_ten: bestMatch.ho_ten,
      status,
      message,
      diffHours,
      he_so_cc,
    });
  } catch (err) {
    console.error("[ERROR] recognizeFace:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi nhận diện khuôn mặt" });
  }
};
