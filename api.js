// Cấu hình URL backend (GAS Web App)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxqcQk3IX2zaDsjdBq76F3uMpVjCU5_nVDjTQ_vgYZUnpS_zsQewSwQnQraqhCvHU36/exec';

async function callAPI(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: body,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });
  return await res.json();
}

const API = {
  login:        (u,p) => callAPI('login', {username:u, password:p}),
  getUserInfo:  (t)   => callAPI('getUserInfo', {token:t}),
  logout:       (t)   => callAPI('logout', {token:t}),
  ping:         ()    => callAPI('ping')
};
