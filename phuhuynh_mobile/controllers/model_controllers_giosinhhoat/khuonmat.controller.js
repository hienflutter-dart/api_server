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

exports.recognizeFace = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu ảnh' });
    }

    console.log(`[DEBUG] 📸 Bắt đầu nhận diện khuôn mặt`);

    // === Giải mã ảnh từ base64 ===
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64, 'base64');
    const imgCanvas = await canvas.loadImage(imgBuffer);

    // === Phát hiện khuôn mặt ===
    const detection = await faceapi
      .detectSingleFace(imgCanvas)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return res.status(400).json({ success: false, message: 'Không phát hiện khuôn mặt' });
    }

    const queryDesc = detection.descriptor;

    // === Lấy dữ liệu nhân viên đang hoạt động ===
    const [rows] = await pool.query(`
      SELECT i.id_nv, i.ho_ten, i.descriptor
      FROM image_nv AS i
      INNER JOIN nhanvien AS n ON i.id_nv = n.id_nv
      WHERE n.trang_thai = 1
    `);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không có dữ liệu khuôn mặt nhân viên' });
    }

    // === So sánh khuôn mặt ===
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
        message: 'Không khớp với khuôn mặt nào trong hệ thống',
        distance: bestDistance.toFixed(3)
      });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    console.log(`✅ Nhận diện: ${bestMatch.ho_ten} (${bestDistance.toFixed(3)})`);

    // === Kiểm tra xem hôm nay đã có dữ liệu chấm công chưa ===
    const [checkAll] = await pool.query(`
      SELECT COUNT(*) AS total FROM ccnv 
      WHERE DATE(ngay_cc_db) = ? OR DATE(ngay_cc_cb) = ?
    `, [today, today]);

    const isFirstOfDay = checkAll[0].total === 0;

    // === Nếu là người đầu tiên hôm nay -> tạo dữ liệu cho toàn bộ nhân viên hoạt động ===
    if (isFirstOfDay) {
      console.log(`[INFO] 🆕 Người đầu tiên hôm nay -> tạo bảng công cho toàn bộ nhân viên đang hoạt động`);
      await pool.execute(`
        INSERT INTO ccnv (id_nv, ho_ten, ngay_cc_db, ngay_cc_cb, he_so_cc, cc_muon)
        SELECT id_nv, ho_ten, NULL, NULL, NULL, NULL
        FROM nhanvien
        WHERE trang_thai = 1
      `);
    }
    

    // === Kiểm tra nhân viên hôm nay ===
    const [checkUser] = await pool.query(`
      SELECT * FROM ccnv WHERE id_nv = ? AND (DATE(ngay_cc_db) = ? OR DATE(ngay_cc_cb) = ?)
    `, [bestMatch.id_nv, today, today]);

    const record = checkUser[0];

    // === Nếu chưa có sáng thì cập nhật sáng ===
    if (!record || !record.ngay_cc_db) {
      await pool.execute(`UPDATE ccnv SET ngay_cc_db = ? WHERE id_nv = ?`, [now, bestMatch.id_nv]);
      console.log(`🌞 ${bestMatch.ho_ten} đã chấm công VÀO thành công.`);
      return res.json({
        success: true,
        
        id_nv: bestMatch.id_nv,
        ho_ten: bestMatch.ho_ten
      });
    }

    // === Nếu chưa có chiều thì cập nhật chiều ===
    if (!record.ngay_cc_cb) {
      await pool.execute(`UPDATE ccnv SET ngay_cc_cb = ? WHERE id_nv = ?`, [now, bestMatch.id_nv]);
      console.log(`🌇 ${bestMatch.ho_ten} đã chấm công RA thành công.`);
    } else {
      // Đã có cả 2 -> cập nhật lại chiều
      await pool.execute(`UPDATE ccnv SET ngay_cc_cb = ? WHERE id_nv = ?`, [now, bestMatch.id_nv]);
      console.log(`🔁 ${bestMatch.ho_ten} cập nhật lại thời gian tan ca.`);
    }

    // === Tính hệ số công (chỉ khi có đủ vào & ra) ===
    const [recordNow] = await pool.query(`
      SELECT ngay_cc_db, ngay_cc_cb FROM ccnv WHERE id_nv = ? AND (DATE(ngay_cc_db) = ? OR DATE(ngay_cc_cb) = ?)
    `, [bestMatch.id_nv, today, today]);

    if (recordNow.length > 0 && recordNow[0].ngay_cc_db && recordNow[0].ngay_cc_cb) {
      const start = new Date(recordNow[0].ngay_cc_db);
      const end = new Date(recordNow[0].ngay_cc_cb);
      const totalWorkMinutes = (end - start) / (1000 * 60);

      const fullDayMinutes = (16.5 - 6.5) * 60; // 600 phút
      let he_so_cc = 0;
      if (totalWorkMinutes >= fullDayMinutes) he_so_cc = 1.0;
      else if (totalWorkMinutes >= fullDayMinutes / 2) he_so_cc = 0.5;

      await pool.execute(`UPDATE ccnv SET he_so_cc = ? WHERE id_nv = ?`, [he_so_cc, bestMatch.id_nv]);
    }

    return res.json({
      success: true,
      
      id_nv: bestMatch.id_nv,
      ho_ten: bestMatch.ho_ten
    });

  } catch (err) {
    console.error('[ERROR] recognizeFace:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi nhận diện khuôn mặt' });
  }
};
