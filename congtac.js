// =====================================================
// CONGTAC.JS - Form chấm công tác
// =====================================================

const STATE = {
  token: null,
  user: null,
  users: [],
  ngayDacBiet: [],
  dsCongTrinh: [],
  rowCount: 0
};

// ============ KHỞI TẠO ============
async function init() {
  STATE.token = sessionStorage.getItem('token');
  if (!STATE.token) { location.href = 'index.html'; return; }

  const r = await API.getUserInfo(STATE.token);
  if (!r.ok) { sessionStorage.clear(); location.href = 'index.html'; return; }
  STATE.user = r.user;
  sessionStorage.setItem('user', JSON.stringify(r.user));

  document.getElementById('userInfo').textContent = '👤 ' + r.user.hoTen;

  // Set ngày hôm nay
  const now = new Date();
  document.getElementById('fNgay').value = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0');

  await loadUsers();
  await loadCongTrinh();
  await loadNgayDacBiet();

  addRow(); // Dòng đầu tiên
  addRow(); // Dòng thứ 2 cho tiện
}

// ============ LOAD DATA ============
async function loadUsers() {
  const r = await API.getUsers(STATE.token);
  if (r.ok) STATE.users = r.users;
}

async function loadCongTrinh() {
  const r = await API.getCongTrinh(STATE.token);
  if (r.ok) STATE.dsCongTrinh = r.items;
}

async function loadNgayDacBiet() {
  // Load 3 tháng gần đây
  const now = new Date();
  const thangs = [];
  for (let i = -1; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    thangs.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
  }
  STATE.ngayDacBiet = [];
  for (const t of thangs) {
    const r = await API.getNgayDacBiet(STATE.token, t);
    if (r.ok && r.items) STATE.ngayDacBiet.push(...r.items);
  }
}

// ============ LOẠI CT → HẠNG MỤC ============
function onLoaiChange() {
  const loai = document.getElementById('fLoaiCT').value;
  const sel = document.getElementById('fHangMuc');
  const wrap = document.getElementById('fieldHangMucWrap');

  // Chỉ SCL, ĐTXD, GS, KN mới có hạng mục
  if (!['SCL','ĐTXD','GS','KN'].includes(loai)) {
    sel.innerHTML = '<option value="">(không có)</option>';
    wrap.style.opacity = '0.5';
    return;
  }
  wrap.style.opacity = '1';

  const list = STATE.dsCongTrinh.filter(x => x.loai === loai);
  sel.innerHTML = '<option value="">-- Chọn --</option>' +
    list.map(x => '<option value="' + x.ma + '">' + x.ma + ' — ' + x.ten + '</option>').join('');
}

// ============ ROWS ============
function addRow() {
  STATE.rowCount++;
  const id = STATE.rowCount;
  const wrap = document.getElementById('rowsWrap');

  const div = document.createElement('div');
  div.className = 'ct-row';
  div.id = 'row_' + id;

  const userOptions = STATE.users.map(u =>
    '<option value="' + u.userID + '">' + u.hoTen + '</option>'
  ).join('');

  div.innerHTML = `
    <div class="field full">
      <label>Người:</label>
      <select class="r-nguoi">${userOptions}</select>
    </div>
    <div class="field">
      <label>Từ giờ:</label>
      <input type="time" class="r-tu" value="08:00" onchange="updatePreview()">
    </div>
    <div class="field">
      <label>Đến giờ:</label>
      <input type="time" class="r-den" value="17:00" onchange="updatePreview()">
    </div>
    <div class="field">
      <label>Loại:</label>
      <select class="r-loai" onchange="updatePreview()">
        <option value="ThiCong">Thi công</option>
        <option value="DiChuyenDi">Di chuyển đi</option>
        <option value="DiChuyenVe">Di chuyển về</option>
        <option value="Nghi">Nghỉ</option>
      </select>
    </div>
    <button class="btn-del" onclick="removeRow(${id})">🗑</button>
  `;

  wrap.appendChild(div);
  updatePreview();
}

function removeRow(id) {
  const el = document.getElementById('row_' + id);
  if (el) el.remove();
  updatePreview();
}

function collectRows() {
  const rows = [];
  document.querySelectorAll('#rowsWrap .ct-row').forEach(el => {
    rows.push({
      nguoi: el.querySelector('.r-nguoi').value,
      tuGio: el.querySelector('.r-tu').value,
      denGio: el.querySelector('.r-den').value,
      loai: el.querySelector('.r-loai').value
    });
  });
  return rows;
}

// ============ PREVIEW ============
function updatePreview() {
  const rows = collectRows();
  const ngayStr = document.getElementById('fNgay').value;
  let tongGoc = 0, tongHeSo = 0;

  rows.forEach(r => {
    if (!r.tuGio || !r.denGio || r.loai === 'Nghi') return;
    const calc = tinhChamCongJS(r.tuGio, r.denGio, ngayStr);
    if (r.loai === 'DiChuyenDi' || r.loai === 'DiChuyenVe') {
      tongGoc += calc.gioGoc;
      tongHeSo += calc.gioGoc; // hệ số 1
    } else {
      tongGoc += calc.gioGoc;
      tongHeSo += calc.gioHeSo;
    }
  });

  document.getElementById('previewText').textContent =
    Math.round(tongGoc*10)/10 + 'h gốc → ' + Math.round(tongHeSo*10)/10 + 'h hệ số';
}

// ============ TÍNH GIỜ (copy từ Calculator.gs) ============
function tinhChamCongJS(tuGio, denGio, ngayStr) {
  if (!ngayStr) ngayStr = new Date().toISOString().slice(0,10);
  const loaiNgay = xacDinhLoaiNgayJS(ngayStr);
  const t1 = toMin(tuGio);
  let t2 = toMin(denGio);
  if (t2 <= t1) t2 += 24*60;

  const mocCat = [t1];
  [360,420,690,810,1020,1320,1440,1800,2160].forEach(m => {
    if (m > t1 && m < t2) mocCat.push(m);
  });
  mocCat.push(t2);
  mocCat.sort((a,b) => a-b);

  let gioGoc = 0, gioHeSo = 0;
  for (let i = 0; i < mocCat.length-1; i++) {
    const a = mocCat[i], b = mocCat[i+1];
    const soGio = Math.round((b-a)/6)/10;
    const pl = phanLoaiJS(a, b, loaiNgay);
    const hs = layHeSoJS(pl, loaiNgay);
    gioGoc += soGio;
    gioHeSo += soGio * hs;
  }
  return {
    loaiNgay,
    gioGoc: Math.round(gioGoc*10)/10,
    gioHeSo: Math.round(gioHeSo*10)/10
  };
}

function xacDinhLoaiNgayJS(ngayStr) {
  for (const item of STATE.ngayDacBiet) {
    if (item.ngay === ngayStr && item.loai === 'Le') return 'LE';
    if (item.ngay === ngayStr && item.loai === 'T7Bu') return 'BU';
  }
  const d = new Date(ngayStr + 'T00:00:00');
  const thu = d.getDay();
  if (thu === 0) return 'CN';
  if (thu === 6) return 'T7';
  return 'THUONG';
}

function phanLoaiJS(a, b, loaiNgay) {
  const mid = (a+b)/2;
  const midNgay = mid % 1440;
  if (['T7','CN','LE'].includes(loaiNgay)) {
    const isDem = midNgay >= 1320 || midNgay < 360;
    return isDem ? 'DEM_TOAN' : 'NGAY_TOAN';
  }
  if (midNgay >= 1320 || midNgay < 360) return 'DEM';
  if ((midNgay >= 420 && midNgay < 690) || (midNgay >= 810 && midNgay < 1020)) return 'HC';
  if (midNgay >= 690 && midNgay < 810) return 'TRUA';
  return 'NGOAI_NGAY';
}

function layHeSoJS(pl, loaiNgay) {
  if (loaiNgay === 'LE') return pl === 'DEM_TOAN' ? 3.5 : 3.0;
  if (['T7','CN'].includes(loaiNgay)) return pl === 'DEM_TOAN' ? 2.5 : 2.0;
  if (pl === 'HC') return 1.0;
  if (pl === 'TRUA') return 1.2;
  if (pl === 'NGOAI_NGAY') return 1.5;
  if (pl === 'DEM') return 1.7;
  return 1.0;
}

function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h*60 + m;
}

// ============ SAVE ============
async function saveForm() {
  const ngay = document.getElementById('fNgay').value;
  const tram = document.getElementById('fTram').value;
  const diaDiem = document.getElementById('fDiaDiem').value.trim();
  const loaiCT = document.getElementById('fLoaiCT').value;
  const hangMuc = document.getElementById('fHangMuc').value;
  const moTa = document.getElementById('fMoTa').value.trim();

  if (!ngay) { toast('Vui lòng chọn ngày', 'err'); return; }
  if (!loaiCT) { toast('Vui lòng chọn loại công tác', 'err'); return; }

  const chiTiet = collectRows().filter(r => r.nguoi && r.tuGio && r.denGio);
  if (chiTiet.length === 0) { toast('Chưa có dòng chi tiết', 'err'); return; }

  showLoading(true);
  try {
    const r = await API.saveCongTac(STATE.token, {
      ngay, tram: Number(tram) || 0, diaDiem,
      loaiCT, hangMuc, moTa, chiTiet
    });
    showLoading(false);

    if (r.ok) {
      toast('✅ Đã lưu ' + r.maCT + ' — ' + r.tongGioGoc + 'h → ' + r.tongGioHeSo + 'h', 'ok');
      setTimeout(() => { if (confirm('Tiếp tục nhập chuyến khác?')) resetForm(); }, 800);
    } else {
      toast('❌ ' + r.msg, 'err');
    }
  } catch(e) {
    showLoading(false);
    toast('❌ Lỗi: ' + e.message, 'err');
  }
}

function resetForm() {
  document.getElementById('fDiaDiem').value = '';
  document.getElementById('fTram').value = '';
  document.getElementById('fLoaiCT').value = '';
  document.getElementById('fHangMuc').innerHTML = '<option value="">-- Chọn --</option>';
  document.getElementById('fMoTa').value = '';
  document.getElementById('rowsWrap').innerHTML = '';
  STATE.rowCount = 0;
  addRow(); addRow();
  updatePreview();
}

// ============ UTILS ============
function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type === 'err' ? ' err' : '');
  setTimeout(() => { el.className = 'toast'; }, 3000);
}

async function doLogout() {
  if (!confirm('Đăng xuất?')) return;
  await API.logout(STATE.token);
  sessionStorage.clear();
  location.href = 'index.html';
}

// ============ BOOT ============
init();
