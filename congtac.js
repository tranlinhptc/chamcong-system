// =====================================================
// CONGTAC.JS - Form chấm công tác (5 tab)
// PHẦN 1: Init + Tab Công tác
// =====================================================

const STATE = {
  token: null,
  user: null,
  users: [],
  ngayDacBiet: [],
  dsCongTrinh: [],
  ctCounter: 0,       // Đếm số block công tác
  ctBlocks: []        // Lưu ref ID các block
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

  // Set ngày hiện tại
  const now = new Date();
  const todayStr = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0');
  document.getElementById('fNgay').value = todayStr;

  // Set tháng hiện tại cho tổng hợp
  document.getElementById('tThang').value = todayStr.substring(0, 7);
  document.getElementById('nbThangTruGio').value = todayStr.substring(0, 7);

  // Set ngày nghỉ mặc định
  document.getElementById('nTuNgay').value = todayStr;
  document.getElementById('nDenNgay').value = todayStr;
  document.getElementById('nbTuNgay').value = todayStr;
  document.getElementById('nbDenNgay').value = todayStr;
  document.getElementById('dhTuNgay').value = todayStr;
  document.getElementById('dhDenNgay').value = todayStr;

  await loadUsers();
  await loadCongTrinh();
  await loadNgayDacBiet();

  renderAllChips();
  updatePreviewCT();
  updatePreviewNghi();
  updatePreviewNghiBu();
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

// ============ TAB SWITCHING ============
function switchTab(idx, btn) {
  document.querySelectorAll('.tab-ct').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab' + idx).classList.add('active');

  if (idx === 1) updatePreviewNghi();
  if (idx === 2) updatePreviewNghiBu();
}

// ============ TÊN NGẮN ============
function getShortName(full) {
  if (!full) return '';
  const parts = full.trim().split(/\s+/);
  let ten = parts[parts.length - 1];
  if (ten === 'Đạt') {
    if (full.includes('Tạ')) ten = 'Đạt(TQ)';
    else if (full.includes('Nguyễn Hữu')) ten = 'Đạt(NH)';
  }
  return ten;
}

// ============ RENDER CHIP ============
function renderChipsInto(containerId, onToggle) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = STATE.users.map(u => {
    return '<div class="chip-nv" data-uid="' + u.userID + '" onclick="toggleChip(this,\'' + onToggle + '\')">' +
      getShortName(u.hoTen) + '</div>';
  }).join('');
}

function toggleChip(el, callbackName) {
  el.classList.toggle('selected');
  // Cập nhật count trong block cha
  const block = el.closest('.ct-block') || el.closest('.card-ct');
  if (block) {
    const count = block.querySelectorAll('.chip-nv.selected').length;
    const cntEl = block.querySelector('.chip-count');
    if (cntEl) cntEl.textContent = count;
  }
  // Gọi callback theo tên (VD: 'updatePreviewCT')
  if (callbackName === 'updatePreviewCT') updatePreviewCT();
  if (callbackName === 'updatePreviewNghi') updatePreviewNghi();
  if (callbackName === 'updatePreviewNghiBu') updatePreviewNghiBu();
}

function selectAllBlock(blockId) {
  const block = document.getElementById(blockId);
  if (!block) return;
  block.querySelectorAll('.chip-nv').forEach(c => c.classList.add('selected'));
  const cntEl = block.querySelector('.chip-count');
  if (cntEl) cntEl.textContent = STATE.users.length;
  updatePreviewCT();
  updatePreviewNghi();
  updatePreviewNghiBu();
}

function clearAllBlock(blockId) {
  const block = document.getElementById(blockId);
  if (!block) return;
  block.querySelectorAll('.chip-nv').forEach(c => c.classList.remove('selected'));
  const cntEl = block.querySelector('.chip-count');
  if (cntEl) cntEl.textContent = '0';
  updatePreviewCT();
  updatePreviewNghi();
  updatePreviewNghiBu();
}

function renderAllChips() {
  renderChipsInto('chipDCD', 'updatePreviewCT');
  renderChipsInto('chipDCV', 'updatePreviewCT');
  renderChipsInto('chipNghi', 'updatePreviewNghi');
  renderChipsInto('chipNghiBu', 'updatePreviewNghiBu');
  renderChipsInto('chipDocHai', '');
}

// ============ TAB CÔNG TÁC ============

function onLoaiChinhChange() {
  const loai = document.querySelector('input[name="loaiChinh"]:checked');
  if (!loai) return;
  const loaiVal = loai.value;

  // Nếu chọn SCL/ĐTXD → hiện dropdown hạng mục
  const wrap = document.getElementById('fieldHangMucCT');
  const sel = document.getElementById('fHangMucCT');

  if (loaiVal === 'SCL' || loaiVal === 'ĐTXD') {
    wrap.style.display = 'block';
    const list = STATE.dsCongTrinh.filter(x => x.loai === loaiVal);
    sel.innerHTML = '<option value="">-- Chọn hạng mục --</option>' +
      list.map(x => '<option value="' + x.ma + '">' + x.ma + ' — ' + x.ten + '</option>').join('');
  } else {
    wrap.style.display = 'none';
    sel.innerHTML = '';
  }
}

function toggleBlock(blockId, show, which) {
  document.getElementById(blockId).style.display = show ? 'block' : 'none';
  if (show && which === 'diChuyenDi') {
    // Set giờ mặc định
    setDefaultTime('dcdTu', 'dcdDen', 6, 7);
  }
  if (show && which === 'diChuyenVe') {
    setDefaultTime('dcvTu', 'dcvDen', 16, 17);
  }
  updatePreviewCT();
}

function setDefaultTime(idTu, idDen, gioTu, gioDen) {
  const ngay = document.getElementById('fNgay').value;
  if (!ngay) return;
  const tu = document.getElementById(idTu);
  const den = document.getElementById(idDen);
  if (!tu.value) tu.value = ngay + 'T' + String(gioTu).padStart(2,'0') + ':00';
  if (!den.value) den.value = ngay + 'T' + String(gioDen).padStart(2,'0') + ':00';
}

// ============ BLOCK CÔNG TÁC ============
function addCongTac(autoCopyFromDCD = true) {
  STATE.ctCounter++;
  const id = STATE.ctCounter;
  STATE.ctBlocks.push(id);

  const wrap = document.getElementById('listCongTac');
  const div = document.createElement('div');
  div.className = 'ct-block';
  div.id = 'ctBlock_' + id;

  const loaiChinh = document.querySelector('input[name="loaiChinh"]:checked');
  const needHangMuc = loaiChinh && ['SCL','ĐTXD'].includes(loaiChinh.value);

  // Render chips
  const chipsHtml = STATE.users.map(u =>
    '<div class="chip-nv" data-uid="' + u.userID + '" onclick="toggleChip(this,\'updatePreviewCT\')">' +
    getShortName(u.hoTen) + '</div>'
  ).join('');

  // Options hạng mục
  let hangMucOptions = '';
  if (needHangMuc) {
    const list = STATE.dsCongTrinh.filter(x => x.loai === loaiChinh.value);
    hangMucOptions = '<option value="">-- Chọn --</option>' +
      list.map(x => '<option value="' + x.ma + '">' + x.ma + ' — ' + x.ten + '</option>').join('');
  }

  const ngay = document.getElementById('fNgay').value;
  const tuDefault = ngay ? ngay + 'T08:00' : '';
  const denDefault = ngay ? ngay + 'T17:00' : '';

  div.innerHTML = `
    <div class="ct-block-head">
      <span class="ct-block-num">Công tác ${id}</span>
      <button class="btn-del-ct" onclick="removeCongTac(${id})">🗑 Xóa</button>
    </div>

    <div class="field">
      <label>Mô tả:</label>
      <input type="text" class="ct-mota" placeholder="VD: Thí nghiệm MBA">
    </div>

    <div class="field">
      <label>Địa điểm:</label>
      <input type="text" class="ct-diadiem" placeholder="VD: Trạm 5 - Đà Lạt">
    </div>

    ${needHangMuc ? `
    <div class="field">
      <label>Hạng mục:</label>
      <select class="ct-hangmuc">${hangMucOptions}</select>
    </div>` : ''}

    <div class="grid-2">
      <div class="field">
        <label>Từ:</label>
        <input type="datetime-local" class="ct-tu" value="${tuDefault}" onchange="updatePreviewCT()">
      </div>
      <div class="field">
        <label>Đến:</label>
        <input type="datetime-local" class="ct-den" value="${denDefault}" onchange="updatePreviewCT()">
      </div>
    </div>

    <label class="chip-label">👥 Người tham gia:</label>
    <div class="chip-tools">
      <button onclick="selectAllBlock('ctBlock_${id}')">✅ Chọn tất cả</button>
      <button onclick="clearAllBlock('ctBlock_${id}')">❌ Bỏ chọn</button>
      <button onclick="copyFromDCD(${id})">📋 Copy từ di chuyển</button>
    </div>
    <div class="chip-grid">${chipsHtml}</div>
    <div class="chip-info">Đã chọn: <b class="chip-count">0</b> người</div>
  `;

  wrap.appendChild(div);

  // Auto copy người từ di chuyển đi (nếu có)
  if (autoCopyFromDCD) {
    const dcdSelected = getSelectedChips('blockDiChuyenDi');
    if (dcdSelected.length > 0) {
      setTimeout(() => {
        const block = document.getElementById('ctBlock_' + id);
        block.querySelectorAll('.chip-nv').forEach(chip => {
          if (dcdSelected.includes(chip.dataset.uid)) chip.classList.add('selected');
        });
        block.querySelector('.chip-count').textContent = dcdSelected.length;
        updatePreviewCT();
      }, 50);
    }
  }

  updatePreviewCT();
}

function removeCongTac(id) {
  const el = document.getElementById('ctBlock_' + id);
  if (el) el.remove();
  STATE.ctBlocks = STATE.ctBlocks.filter(x => x !== id);
  updatePreviewCT();
}

function copyFromDCD(ctBlockId) {
  const dcdSelected = getSelectedChips('blockDiChuyenDi');
  if (dcdSelected.length === 0) {
    toast('Chưa chọn ai ở "Di chuyển đi"', 'err');
    return;
  }
  const block = document.getElementById('ctBlock_' + ctBlockId);
  block.querySelectorAll('.chip-nv').forEach(chip => {
    if (dcdSelected.includes(chip.dataset.uid)) chip.classList.add('selected');
  });
  block.querySelector('.chip-count').textContent = dcdSelected.length;
  updatePreviewCT();
}

function getSelectedChips(blockId) {
  const block = document.getElementById(blockId);
  if (!block) return [];
  const ds = [];
  block.querySelectorAll('.chip-nv.selected').forEach(c => ds.push(c.dataset.uid));
  return ds;
}

// ============ COLLECT DATA CÔNG TÁC ============
function collectCongTac() {
  const result = {
    diChuyenDi: null,
    congTac: [],
    diChuyenVe: null
  };

  // Di chuyển đi
  if (document.getElementById('cbDiChuyenDi').checked) {
    const nguoi = getSelectedChips('blockDiChuyenDi');
    const tu = document.getElementById('dcdTu').value;
    const den = document.getElementById('dcdDen').value;
    if (tu && den && nguoi.length > 0) {
      result.diChuyenDi = { tu, den, nguoi };
    }
  }

  // Công tác
  document.querySelectorAll('#listCongTac .ct-block').forEach(block => {
    const nguoi = [];
    block.querySelectorAll('.chip-nv.selected').forEach(c => nguoi.push(c.dataset.uid));
    const tu = block.querySelector('.ct-tu').value;
    const den = block.querySelector('.ct-den').value;
    const hangMucEl = block.querySelector('.ct-hangmuc');

    if (tu && den && nguoi.length > 0) {
      const loaiChinh = document.querySelector('input[name="loaiChinh"]:checked');
      result.congTac.push({
        moTa: block.querySelector('.ct-mota').value.trim(),
        diaDiem: block.querySelector('.ct-diadiem').value.trim(),
        loaiCT: loaiChinh ? loaiChinh.value : '',
        hangMuc: hangMucEl ? hangMucEl.value : '',
        tu, den, nguoi
      });
    }
  });

  // Di chuyển về
  if (document.getElementById('cbDiChuyenVe').checked) {
    const nguoi = getSelectedChips('blockDiChuyenVe');
    const tu = document.getElementById('dcvTu').value;
    const den = document.getElementById('dcvDen').value;
    if (tu && den && nguoi.length > 0) {
      result.diChuyenVe = { tu, den, nguoi };
    }
  }

  return result;
}

// ============ PREVIEW CÔNG TÁC ============
function updatePreviewCT() {
  const data = collectCongTac();
  const ngay = document.getElementById('fNgay').value;
  let tongGoc = 0, tongHeSo = 0;
  const dsNguoiAll = new Set();

  // Di chuyển đi — hệ số 1.0
  if (data.diChuyenDi) {
    const calc = tinhChamCongJS(data.diChuyenDi.tu, data.diChuyenDi.den, ngay);
    tongGoc += calc.gioGoc * data.diChuyenDi.nguoi.length;
    tongHeSo += calc.gioGoc * data.diChuyenDi.nguoi.length;
    data.diChuyenDi.nguoi.forEach(n => dsNguoiAll.add(n));
  }

  // Công tác — hệ số theo giờ
  data.congTac.forEach(ct => {
    const calc = tinhChamCongJS(ct.tu, ct.den, ngay);
    tongGoc += calc.gioGoc * ct.nguoi.length;
    tongHeSo += calc.gioHeSo * ct.nguoi.length;
    ct.nguoi.forEach(n => dsNguoiAll.add(n));
  });

  // Di chuyển về — hệ số 1.0
  if (data.diChuyenVe) {
    const calc = tinhChamCongJS(data.diChuyenVe.tu, data.diChuyenVe.den, ngay);
    tongGoc += calc.gioGoc * data.diChuyenVe.nguoi.length;
    tongHeSo += calc.gioGoc * data.diChuyenVe.nguoi.length;
    data.diChuyenVe.nguoi.forEach(n => dsNguoiAll.add(n));
  }

  document.getElementById('previewCTText').textContent =
    dsNguoiAll.size + ' người • ' +
    (Math.round(tongGoc*10)/10) + 'h gốc → ' +
    (Math.round(tongHeSo*10)/10) + 'h hệ số';
}

// ============ SAVE CÔNG TÁC ============
async function saveFormCT() {
  const loaiChinhEl = document.querySelector('input[name="loaiChinh"]:checked');
  if (!loaiChinhEl) { toast('Chưa chọn loại công tác', 'err'); return; }
  const loaiChinh = loaiChinhEl.value;

  const ngay = document.getElementById('fNgay').value;
  if (!ngay) { toast('Chưa chọn ngày', 'err'); return; }

  const data = collectCongTac();
  if (data.congTac.length === 0) { toast('Chưa có công tác nào', 'err'); return; }

  // Kiểm tra hạng mục bắt buộc
  if (loaiChinh === 'SCL' || loaiChinh === 'ĐTXD') {
    const missing = data.congTac.some(ct => !ct.hangMuc);
    if (missing) { toast('Vui lòng chọn hạng mục cho tất cả công tác', 'err'); return; }
  }

  const soNguoi = new Set();
  data.congTac.forEach(ct => ct.nguoi.forEach(n => soNguoi.add(n)));
  if (!confirm('Lưu công tác cho ' + soNguoi.size + ' người?')) return;

  showLoading(true);
  try {
    const r = await API.saveCongTac(STATE.token, {
      ngay,
      loaiChinh,
      chiTiet: data
    });
    showLoading(false);

    if (r.ok) {
      toast('✅ Đã lưu ' + r.maCT + ' — ' + r.tongGioGoc + 'h → ' + r.tongGioHeSo + 'h', 'ok');
      setTimeout(() => { if (confirm('Tiếp tục nhập chuyến khác?')) resetFormCT(); }, 800);
    } else {
      toast('❌ ' + r.msg, 'err');
    }
  } catch(e) {
    showLoading(false);
    toast('❌ Lỗi: ' + e.message, 'err');
  }
}

function resetFormCT() {
  document.querySelectorAll('input[name="loaiChinh"]').forEach(r => r.checked = false);
  document.getElementById('fieldHangMucCT').style.display = 'none';
  document.getElementById('fTram').value = '';
  document.getElementById('fMoTa').value = '';
  document.getElementById('cbDiChuyenDi').checked = false;
  document.getElementById('cbDiChuyenVe').checked = false;
  document.getElementById('blockDiChuyenDi').style.display = 'none';
  document.getElementById('blockDiChuyenVe').style.display = 'none';
  document.getElementById('listCongTac').innerHTML = '';
  STATE.ctBlocks = [];
  STATE.ctCounter = 0;
  clearAllBlock('blockDiChuyenDi');
  clearAllBlock('blockDiChuyenVe');
  updatePreviewCT();
}

// ============ TÍNH GIỜ CLIENT (giống backend) ============
function tinhChamCongJS(tuDatetime, denDatetime, ngayStr) {
  if (!tuDatetime || !denDatetime || !ngayStr) return { gioGoc: 0, gioHeSo: 0, loaiNgay: 'THUONG' };

  // Extract HH:MM
  const tuGio = tuDatetime.includes('T') ? tuDatetime.split('T')[1].substring(0,5) : tuDatetime;
  const denGio = denDatetime.includes('T') ? denDatetime.split('T')[1].substring(0,5) : denDatetime;

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
    if (item.ngay === ngayStr) {
      if (item.loai === 'Le') return 'LE';
      if (item.loai === 'T7Bu') return 'BU';
    }
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
  if (!hhmm) return 0;
  let s = String(hhmm);
  if (s.includes('T')) s = s.split('T')[1];
  s = s.substring(0, 5);
  const parts = s.split(':');
  return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
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

// Placeholder cho các hàm tab khác (sẽ có ở phần 2)
// ============ TAB 1: NGHỈ ============
function updatePreviewNghi() {
  const tu = document.getElementById('nTuNgay').value;
  const den = document.getElementById('nDenNgay').value;
  const nguoi = getSelectedChips('blockNghi');

  let soNgay = 0;
  if (tu && den) {
    const d1 = new Date(tu + 'T00:00:00');
    const d2 = new Date(den + 'T00:00:00');
    soNgay = Math.floor((d2 - d1) / (24*60*60*1000)) + 1;
    if (soNgay < 0) soNgay = 0;
  }

  document.getElementById('previewNghiText').textContent =
    nguoi.length + ' người × ' + soNgay + ' ngày = ' +
    (nguoi.length * soNgay) + ' ngày công';
}

async function saveFormNghi() {
  const tu = document.getElementById('nTuNgay').value;
  const den = document.getElementById('nDenNgay').value;
  const loai = document.getElementById('nLoai').value;
  const lyDo = document.getElementById('nLyDo').value.trim();
  const nguoi = getSelectedChips('blockNghi');

  if (!tu || !den) { toast('Chưa chọn ngày', 'err'); return; }
  if (nguoi.length === 0) { toast('Chưa chọn người', 'err'); return; }

  if (!confirm('Lưu nghỉ ' + loai + ' cho ' + nguoi.length + ' người?')) return;

  showLoading(true);
  try {
    const r = await API.saveNghi(STATE.token, {
      dsNguoi: nguoi, tuNgay: tu, denNgay: den, loai, lyDo
    });
    showLoading(false);
    if (r.ok) {
      toast('✅ Đã lưu ' + r.tongNgayCong + ' ngày công cho ' + r.soNguoi + ' người', 'ok');
      setTimeout(() => { if (confirm('Nhập tiếp?')) resetFormNghi(); }, 800);
    } else {
      toast('❌ ' + r.msg, 'err');
    }
  } catch(e) {
    showLoading(false);
    toast('❌ Lỗi: ' + e.message, 'err');
  }
}

function resetFormNghi() {
  const now = new Date();
  const todayStr = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0');
  document.getElementById('nTuNgay').value = todayStr;
  document.getElementById('nDenNgay').value = todayStr;
  document.getElementById('nLoai').value = 'P';
  document.getElementById('nLyDo').value = '';
  clearAllBlock('blockNghi');
  updatePreviewNghi();
}

// ============ TAB 2: NGHỈ BÙ ============
function updatePreviewNghiBu() {
  const nguoi = getSelectedChips('blockNghiBu');
  const soGio = Number(document.getElementById('nbSoGio').value) || 0;
  const thang = document.getElementById('nbThangTruGio').value || '...';
  document.getElementById('previewNghiBuText').textContent =
    nguoi.length + ' người × ' + soGio + 'h = ' +
    (nguoi.length * soGio) + 'h (trừ vào ' + thang + ')';
}

async function saveFormNghiBu() {
  const tu = document.getElementById('nbTuNgay').value;
  const den = document.getElementById('nbDenNgay').value;
  const soGio = Number(document.getElementById('nbSoGio').value);
  const thangTruGio = document.getElementById('nbThangTruGio').value;
  const lyDo = document.getElementById('nbLyDo').value.trim();
  const nguoi = getSelectedChips('blockNghiBu');

  if (!tu || !den) { toast('Chưa chọn ngày', 'err'); return; }
  if (!thangTruGio) { toast('Chưa chọn tháng trừ giờ', 'err'); return; }
  if (nguoi.length === 0) { toast('Chưa chọn người', 'err'); return; }

  if (!confirm('Lưu nghỉ bù ' + soGio + 'h cho ' + nguoi.length +
               ' người?\n⚠️ Trừ vào tháng ' + thangTruGio)) return;

  showLoading(true);
  try {
    const r = await API.saveNghiBu(STATE.token, {
      dsNguoi: nguoi, tuNgay: tu, denNgay: den,
      soGio, thangTruGio, lyDo
    });
    showLoading(false);
    if (r.ok) {
      toast('✅ Đã lưu — trừ ' + r.tongGioTru + 'h vào ' + thangTruGio, 'ok');
      setTimeout(() => { if (confirm('Nhập tiếp?')) resetFormNghiBu(); }, 800);
    } else {
      toast('❌ ' + r.msg, 'err');
    }
  } catch(e) {
    showLoading(false);
    toast('❌ Lỗi: ' + e.message, 'err');
  }
}

function resetFormNghiBu() {
  const now = new Date();
  const todayStr = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0');
  document.getElementById('nbTuNgay').value = todayStr;
  document.getElementById('nbDenNgay').value = todayStr;
  document.getElementById('nbSoGio').value = '8';
  document.getElementById('nbThangTruGio').value = todayStr.substring(0,7);
  document.getElementById('nbLyDo').value = '';
  clearAllBlock('blockNghiBu');
  updatePreviewNghiBu();
}

// ============ TAB 3: ĐỘC HẠI ============
async function saveFormDocHai() {
  const tu = document.getElementById('dhTuNgay').value;
  const den = document.getElementById('dhDenNgay').value;
  const mucDo = document.getElementById('dhMucDo').value;
  const ghiChu = document.getElementById('dhGhiChu').value.trim();
  const nguoi = getSelectedChips('blockDocHai');

  if (!tu || !den) { toast('Chưa chọn ngày', 'err'); return; }
  if (nguoi.length === 0) { toast('Chưa chọn người', 'err'); return; }

  const soNgay = Math.floor((new Date(den + 'T00:00:00') -
                             new Date(tu + 'T00:00:00')) / (24*60*60*1000)) + 1;
  if (!confirm('Lưu độc hại ' + mucDo + ' cho ' + nguoi.length +
               ' người × ' + soNgay + ' ngày?')) return;

  showLoading(true);
  try {
    const r = await API.saveDocHai(STATE.token, {
      dsNguoi: nguoi, tuNgay: tu, denNgay: den, mucDo, ghiChu
    });
    showLoading(false);
    if (r.ok) {
      toast('✅ Đã lưu ' + r.soBan + ' bản ghi độc hại', 'ok');
      setTimeout(() => { if (confirm('Nhập tiếp?')) resetFormDocHai(); }, 800);
    } else {
      toast('❌ ' + r.msg, 'err');
    }
  } catch(e) {
    showLoading(false);
    toast('❌ Lỗi: ' + e.message, 'err');
  }
}

function resetFormDocHai() {
  const now = new Date();
  const todayStr = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0');
  document.getElementById('dhTuNgay').value = todayStr;
  document.getElementById('dhDenNgay').value = todayStr;
  document.getElementById('dhMucDo').value = 'DH';
  document.getElementById('dhGhiChu').value = '';
  clearAllBlock('blockDocHai');
}

// ============ TAB 4: TỔNG HỢP ============
async function loadTongHop() {
  const thang = document.getElementById('tThang').value;
  if (!thang) { toast('Chưa chọn tháng', 'err'); return; }

  const dsLoai = [];
  document.querySelectorAll('.tLoai:checked').forEach(c => dsLoai.push(c.value));

  showLoading(true);
  try {
    const [rCT, rNghi, rNghiBu, rDH] = await Promise.all([
      API.getCongTac(STATE.token, { dsThang: [thang], dsLoai }),
      API.getNghi(STATE.token, { dsThang: [thang] }),
      API.getNghiBu(STATE.token, { thangTruGio: thang }),
      API.getDocHai(STATE.token, { dsThang: [thang] })
    ]);
    showLoading(false);

    STATE.tongHopData = {
      thang, dsLoai,
      congTac: rCT.ok ? rCT.items : [],
      nghi: rNghi.ok ? rNghi.items : [],
      nghiBu: rNghiBu.ok ? rNghiBu.items : [],
      docHai: rDH.ok ? rDH.items : []
    };

    let tongGoc = 0, tongHeSo = 0;
    STATE.tongHopData.congTac.forEach(ct => {
      tongGoc += ct.tongGioGoc || 0;
      tongHeSo += ct.tongGioHeSo || 0;
    });

    const soNgayNghi = STATE.tongHopData.nghi.reduce((s, n) => s + (n.soNgay || 0), 0);
    const soGioNghiBu = STATE.tongHopData.nghiBu.reduce((s, n) => s + (n.soGio || 0), 0);

    document.getElementById('tongHopPreview').innerHTML = `
      <div class="preview-box">
        <b>📊 Tháng ${thang}:</b><br>
        • Công tác: <b>${STATE.tongHopData.congTac.length}</b> chuyến
          (${Math.round(tongGoc*10)/10}h gốc → ${Math.round(tongHeSo*10)/10}h hệ số)<br>
        • Nghỉ: <b>${STATE.tongHopData.nghi.length}</b> bản ghi (${soNgayNghi} ngày)<br>
        • Nghỉ bù: <b>${STATE.tongHopData.nghiBu.length}</b> bản ghi (${soGioNghiBu}h trừ)<br>
        • Độc hại: <b>${STATE.tongHopData.docHai.length}</b> bản ghi
      </div>
    `;
  } catch(e) {
    showLoading(false);
    toast('❌ Lỗi: ' + e.message, 'err');
  }
}

function exportExcel() {
  if (!STATE.tongHopData) {
    toast('Vui lòng bấm "Tải dữ liệu" trước', 'err');
    return;
  }
  if (typeof XLSX === 'undefined') {
    toast('Chưa tải SheetJS. F5 lại trang', 'err');
    return;
  }

  const { thang, congTac, nghi, nghiBu, docHai } = STATE.tongHopData;

  // Sheet 1: Công tác chi tiết
  const ws1 = [['Mã CT', 'Ngày', 'Loại', 'Chi tiết', 'Tổng giờ gốc', 'Tổng giờ hệ số']];
  congTac.forEach(ct => {
    let ctStr = '';
    const c = ct.chiTiet || {};
    if (c.diChuyenDi) {
      ctStr += 'Đi ' + c.diChuyenDi.tu.split('T')[1] + '→' +
               c.diChuyenDi.den.split('T')[1] + ' (' + c.diChuyenDi.nguoi.join(',') + '); ';
    }
    (c.congTac || []).forEach(g => {
      ctStr += (g.hangMuc || g.loaiCT) + ' ' +
               g.tu.split('T')[1] + '→' + g.den.split('T')[1] +
               ' (' + g.nguoi.join(',') + '); ';
    });
    if (c.diChuyenVe) {
      ctStr += 'Về ' + c.diChuyenVe.tu.split('T')[1] + '→' +
               c.diChuyenVe.den.split('T')[1] + ' (' + c.diChuyenVe.nguoi.join(',') + ')';
    }
    ws1.push([ct.maCT, ct.ngay, ct.loaiChinh, ctStr, ct.tongGioGoc, ct.tongGioHeSo]);
  });

  // Sheet 2: Nghỉ
  const ws2 = [['ID', 'Người', 'Từ ngày', 'Đến ngày', 'Số ngày', 'Loại', 'Lý do']];
  nghi.forEach(n => ws2.push([n.id, n.nguoi, n.tuNgay, n.denNgay, n.soNgay, n.loai, n.lyDo]));

  // Sheet 3: Nghỉ bù
  const ws3 = [['ID', 'Người', 'Từ ngày', 'Đến ngày', 'Số giờ', 'Tháng trừ', 'Lý do']];
  nghiBu.forEach(n => ws3.push([n.id, n.nguoi, n.tuNgay, n.denNgay, n.soGio, n.thangTruGio, n.lyDo]));

  // Sheet 4: Độc hại
  const ws4 = [['ID', 'Người', 'Ngày', 'Mức độ', 'Ghi chú']];
  docHai.forEach(d => ws4.push([d.id, d.nguoi, d.ngay, d.mucDo, d.ghiChu]));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws1), 'CongTac');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws2), 'Nghi');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws3), 'NghiBu');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws4), 'DocHai');

  XLSX.writeFile(wb, 'CongTac_' + thang + '.xlsx');
  toast('✅ Đã xuất file CongTac_' + thang + '.xlsx', 'ok');
}

// ============ BOOT ============
init();
