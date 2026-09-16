// Cấu hình URL backend (GAS Web App)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyhnEPOy8x9rMJZ75z1ajlWMeaCZAz7lF3z4vWxPg5vXd0OznSBKvSEmZqcuU0lLBZO/exec';
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
