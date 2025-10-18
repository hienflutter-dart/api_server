const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const nhanvienapproutes = require('./nhanvien_mobile/app_routers_nhanvien');
const phuhuynhapproutes = require('./phuhuynh_mobile/app_routers_phuhuynh');



const { sessionMiddleware } = require('./config/sessions/initsession');
const { guard, router: sessionRouter, reclaimExpiredSessions } = require('./config/sessions/indexsession');

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Core session
// app.use(sessionMiddleware);
// app.use(guard);
// app.use('/api/session', sessionRouter);
app.use((req, res, next) => {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(`[TIMER] ${req.method} ${req.originalUrl} -> ${res.statusCode} in ${ms.toFixed(1)}ms`);
  });
  next();
});
// Các route nghiệp vụ
app.use('/api/nhanvien-mobile', nhanvienapproutes);
app.use('/api/phuhuynh-mobile', phuhuynhapproutes);


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//dọn rác định kỳ
// setInterval(reclaimExpiredSessions, 1000 * 60 * 5); 
