// faceapi.js
const faceapi = require('@vladmandic/face-api');
require('@tensorflow/tfjs'); // JS-only backend
faceapi.tf.setBackend('cpu'); // ép dùng CPU backend (JS)
faceapi.tf.enableProdMode();
module.exports = faceapi;
