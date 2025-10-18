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

    res.json({message: 'Đăng ký khuôn mặt thành công' });
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

    // === Phát hiện khuôn mặt trong ảnh ===
    const detection = await faceapi
      .detectSingleFace(imgCanvas)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.log(`[DEBUG] ❌ Không phát hiện khuôn mặt trong ảnh`);
      return res.status(400).json({ success: false, message: 'Không phát hiện khuôn mặt' });
    }

    const queryDesc = detection.descriptor;

    // === Lấy descriptor từ DB ===
    const [rows] = await pool.query('SELECT id_nv, ho_ten, descriptor FROM image_nv');
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chưa có dữ liệu khuôn mặt trong hệ thống' });
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
    console.log(`---------------------------------------------`);
    console.log(`🔍 Gần nhất: ${bestMatch?.ho_ten ?? "Không xác định"}`);
    console.log(`📏 Distance: ${bestDistance.toFixed(3)}`);
    console.log(`---------------------------------------------`);

    if (bestDistance >= THRESHOLD) {
      return res.json({
        success: false,
        message: 'Không khớp với bất kỳ khuôn mặt nào trong hệ thống',
        distance: bestDistance.toFixed(3)
      });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = now.getHours();
    const minute = now.getMinutes();

    // === Kiểm tra đã chấm công trong ngày chưa ===
    const [exists] = await pool.query(
      `SELECT * FROM ccnv WHERE id_nv = ? AND DATE(ngay_cc_db) = ?`,
      [bestMatch.id_nv, today]
    );

    if (exists.length > 0) {
      const record = exists[0];
      // Đã có điểm danh sáng và chiều thì không cho chấm nữa
      if (record.ngay_cc_db && record.ngay_cc_cb) {
        return res.json({
          success: false,
          message: `${bestMatch.ho_ten} đã điểm danh đầy đủ hôm nay.`,
          id_nv: bestMatch.id_nv,
          ho_ten: bestMatch.ho_ten
        });
      }
      // Nếu mới có sáng, thì điểm danh chiều
      if (!record.ngay_cc_cb && hour >= 12) {
        await pool.execute(
          `UPDATE ccnv SET ngay_cc_cb = ? WHERE id_nv = ? AND DATE(ngay_cc_db) = ?`,
          [now, bestMatch.id_nv, today]
        );
        console.log(`📅 ✅ ${bestMatch.ho_ten} đã chấm công TAN CA thành công.`);
        return res.json({
          success: true,
          message: `Chấm công tan ca thành công cho ${bestMatch.ho_ten}`,
          id_nv: bestMatch.id_nv,
          ho_ten: bestMatch.ho_ten
        });
      } else {
        return res.json({
          success: false,
          message: `${bestMatch.ho_ten} đã điểm danh buổi sáng hôm nay.`,
          id_nv: bestMatch.id_nv,
          ho_ten: bestMatch.ho_ten
        });
      }
    }

    // === Nếu chưa có bản ghi trong ngày, xác định sáng/chiều ===
    let ngay_cc_db = null;
    let ngay_cc_cb = null;
    let buoi = '';

    // Gần 6h30 (6:00–11:59) => sáng
    if (hour < 12) {
      ngay_cc_db = now;
      buoi = 'đi làm';
    }
    // Gần 16h30 (12:00–19:00) => chiều
    else if (hour >= 12) {
      ngay_cc_cb = now;
      buoi = 'tan ca';
    }

    await pool.execute(
      `INSERT INTO ccnv (id_nv, ho_ten, ngay_cc_db, ngay_cc_cb, id_index, he_so_cc, cc_muon)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        bestMatch.id_nv,
        bestMatch.ho_ten,
        ngay_cc_db,
        ngay_cc_cb,
        34,
        1.0,
        0
      ]
    );

    console.log(`📅 ✅ ${bestMatch.ho_ten} đã chấm công ${buoi} thành công.`);
    return res.json({
      success: true,
      message: `Chấm công ${buoi} thành công cho ${bestMatch.ho_ten}`,
      id_nv: bestMatch.id_nv,
      ho_ten: bestMatch.ho_ten,
      distance: bestDistance.toFixed(3)
    });

  } catch (err) {
    console.error('[ERROR] recognizeFace:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi nhận diện khuôn mặt' });
  }
};
