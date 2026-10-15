// =====================================================
// API.JS - Wrapper gọi Google Apps Script
// =====================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyhnEPOy8x9rMJZ75z1ajlWMeaCZAz7lF3z4vWxPg5vXd0OznSBKvSEmZqcuU0lLBZO/exec';

async function callAPI(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: body,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    cache: 'no-store'
  });
  return await res.json();
}

const API = {
  // Auth
  login:        (u,p) => callAPI('login', {username:u, password:p}),
  getUserInfo:  (t)   => callAPI('getUserInfo', {token:t}),
  logout:       (t)   => callAPI('logout', {token:t}),
  ping:         ()    => callAPI('ping'),

  // Users
  getUsers:     (t)   => callAPI('getUsers', {token:t}),

  // Chấm công cũ (giữ nguyên)
  getChamCong:    (t, thang) => callAPI('getChamCong', {token:t, thang}),
  getNgayDacBiet: (t, thang) => callAPI('getNgayDacBiet', {token:t, thang}),
  saveChamCong:   (t, data)  => callAPI('saveChamCong', {token:t, ...data}),
  deleteChamCong: (t, maBC)  => callAPI('deleteChamCong', {token:t, maBC}),

  // ✅ CÔNG TÁC (MỚI)
  getCongTrinh:      (t)       => callAPI('getCongTrinh', {token:t}),
  saveCongTrinh:     (t, data) => callAPI('saveCongTrinh', {token:t, ...data}),
  saveCongTac:       (t, data) => callAPI('saveCongTac', {token:t, ...data}),
  getCongTac:        (t, data) => callAPI('getCongTac', {token:t, ...data}),
  getCongTacChiTiet: (t, maCT) => callAPI('getCongTacChiTiet', {token:t, maCT}),
  deleteCongTac:     (t, maCT) => callAPI('deleteCongTac', {token:t, maCT}),

  // ✅ NGHỈ BÙ (MỚI)
  saveNghiBu: (t, data) => callAPI('saveNghiBu', {token:t, ...data}),
  getNghiBu:  (t, data) => callAPI('getNghiBu', {token:t, ...data})
};
