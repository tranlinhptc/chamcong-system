async function callAPI(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: body,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' } // tránh CORS preflight
  });
  return await res.json();
}

const API = {
  login:        (u,p) => callAPI('login', {username:u, password:p}),
  getUserInfo:  (t)   => callAPI('getUserInfo', {token:t}),
  logout:       (t)   => callAPI('logout', {token:t}),
  ping:         ()    => callAPI('ping')
};
