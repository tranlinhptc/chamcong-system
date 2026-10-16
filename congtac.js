// =====================================================
// CONGTAC.JS - Form chấm công tác (5 tab)
// BẢN SỬA: Fix chip + Tab Tổng hợp
// =====================================================

const STATE = {
  token: null,
  user: null,
  users: [],
  ngayDacBiet: [],
  dsCongTrinh: [],
  ctCounter: 0,
  ctBlocks: [],
  tongHopData: null
};

// ============ KHỞI TẠO ============
async function init() {
  STATE.token = sessionStorage.getItem('token');
  if (!STATE.token) { location.href = 'index.html'; return; }

  const r = await API.getUserInfo(STATE.token);
  if (!r.ok) { sessionStorage.clear(); location.href = 'index.html'; return; }
  STATE.user = r.user;

  const now = new Date();
  const todayStr = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0');

  document.getElementById('fNgay').value = todayStr;
  document.getElementById('nTuNgay').value = todayStr;
  document.getElementById('nDenNgay').value = todayStr;
  document.getElementById('nbTuNgay').value = todayStr;
  document.getElementById('nbDenNgay').value = todayStr;
  document.getElementById('dhTuNgay').value = todayStr;
  document.getElementById('dhDenNgay').value = todayStr;
  document.getElementById('tThang').value = todayStr.substring(0, 7);
  document.getElementById('nbThangTruGio').value = todayStr.substring(0, 7);

  await loadUsers();
  await loadCongTrinh();
  await loadNgayDacBiet();

  renderAllChips();
  updatePreviewCT();
  updatePreviewNghi();
  updatePreviewNghiBu();
}

// ============ LOAD ============
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

// ============ TAB SWITCH ============
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

// ============ CHIP HANDLERS (FIX) ============
function renderChipsInto(chipGridId, callbackName) {
  const grid = document.getElementById(chipGridId);
  if (!grid) return;
  grid.innerHTML = STATE.users.map(u =>
    '<div class="chip-nv" data-uid="' + u.userID + '" ' +
    'onclick="toggleChip(this,\'' + callbackName + '\')">' +
    getShortName(u.hoTen) + '</div>'
  ).join('');
}

function renderAllChips() {
  renderChipsInto('chipDCD', 'updatePreviewCT');
  renderChipsInto('chipDCV', 'updatePreviewCT');
  renderChipsInto('chipNghi', 'updatePreviewNghi');
  renderChipsInto('chipNghiBu', 'updatePreviewNghiBu');
  renderChipsInto('chipDocHai', '');
}

function toggleChip(el, callbackName) {
  el.classList.toggle('selected');
  // Cập nhật count cho chip-grid hiện tại
  const grid = el.closest('.chip-grid');
  if (grid) {
    const count = grid.querySelectorAll('.chip-nv.selected').length;
    const wrap = grid.closest('.chip-wrap') || grid.parentElement;
    const cntEl = wrap ? wrap.querySelector('.chip-count') : null;
    if (cntEl) cntEl.textContent = count;
  }
  // Gọi callback
  if (callbackName === 'updatePreviewCT') updatePreviewCT();
  else if (callbackName === 'updatePreviewNghi') updatePreviewNghi();
  else if (callbackName === 'updatePreviewNghiBu') updatePreviewNghiBu();
}

function findChipGrid(id) {
  // Nếu id chính là chip-grid
  let el = document.getElementById(id);
  if (!el) return null;
  if (el.classList.contains('chip-grid')) return el;
  // Nếu id là wrapper → tìm chip-grid con
  const inner = el.querySelector('.chip-grid');
  if (inner) return inner;
  return null;
}

function selectAllBlock(id) {
  const grid = findChipGrid(id);
  if (!grid) return;
  grid.querySelectorAll('.chip-nv').forEach(c => c.classList.add('selected'));
  const wrap = grid.closest('.chip-wrap') || grid.parentElement;
  const cntEl = wrap ? wrap.querySelector('.chip-count') : null;
  if (cntEl) cntEl.textContent = STATE.users.length;
  updatePreviewCT(); updatePreviewNghi(); updatePreviewNghiBu();
}

function clearAllBlock(id) {
  const grid = findChipGrid(id);
  if (!grid) return;
  grid.querySelectorAll('.chip-nv').forEach(c => c.classList.remove('selected'));
  const wrap = grid.closest('.chip-wrap') || grid.parentElement;
  const cntEl = wrap ? wrap.querySelector('.chip-count') : null;
  if (cntEl) cntEl.textContent = '0';
  updatePreviewCT(); updatePreviewNghi(); updatePreviewNghiBu();
}

function getSelectedChips(chipGridId) {
  const grid = document.getElementById(chipGridId);
  if (!grid) return [];
  const ds = [];
  grid.querySelectorAll('.chip-nv.selected').forEach(c => ds.push(c.dataset.uid));
  return ds;
}

// ============ TAB 0: CÔNG TÁC ============
function onLoaiChinhChange() {
  const loai = document.querySelector('input[name="loaiChinh"]:checked');
  if (!loai) return;
  const loaiVal = loai.value;
  const wrap = document.getElementById('fieldHangMucCT');
  const sel = document.getElementById('fHangMucCT');

  if (loaiVal === 'SCL' || loaiVal === 'ĐTXD') {
    wrap.style.display = 'block';
    const list = STATE.dsCongTrinh.filter(x => x.loai === loaiVal);
    sel.innerHTML = '<option value="">-- Chọn --</option>' +
      list.map(x => '<option value="' + x.ma + '">' + x.ma + ' — ' + x.ten + '</option>').join('');
  } else {
    wrap.style.display = 'none';
    sel.innerHTML = '';
  }
}

function toggleBlock(blockId, show, which) {
  document.getElementById(blockId).style.display = show ? 'block' : 'none';
  if (show) {
    const ngay = document.getElementById('fNgay').value;
    if (which === 'diChuyenDi') {
      const tu = document.getElementById('dcdTu');
      const den = document.getElementById('dcdDen');
      if (!tu.value && ngay) tu.value = ngay + 'T06:00';
      if (!den.value && ngay) den.value = ngay + 'T07:00';
    }
    if (which === 'diChuyenVe') {
      const tu = document.getElementById('dcvTu');
      const den = document.getElementById('dcvDen');
      if (!tu.value && ngay) tu.value = ngay + 'T16:00';
      if (!den.value && ngay) den.value = ngay + 'T17:00';
    }
  }
  updatePreviewCT();
}

function addCongTac() {
  STATE.ctCounter++;
  const id = STATE.ctCounter;
  STATE.ctBlocks.push(id);

  const wrap = document.getElementById('listCongTac');
  const div = document.createElement('div');
  div.className = 'ct-block';
  div.id = 'ctBlock_' + id;

  const loaiChinh = document.querySelector('input[name="loaiChinh"]:checked');
  const needHangMuc = loaiChinh && ['SCL','ĐTXD'].includes(loaiChinh.value);

  const chipsHtml = STATE.users.map(u =>
    '<div class="chip-nv" data-uid="' + u.userID + '" onclick="toggleChip(this,\'updatePreviewCT\')">' +
    getShortName(u.hoTen) + '</div>'
  ).join('');

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
      <button class="btn-del-ct" onclick="removeCongTac(${id})">🗑</button>
    </div>
    <div class="field">
      <label>Mô tả:</label>
      <input type="text" class="ct-mota" placeholder="VD: Thí nghiệm MBA">
    </div>
    <div class="field">
      <label>Địa điểm:</label>
      <input type="text" class="ct-diadiem" placeholder="VD: Trạm 5">
    </div>
    ${needHangMuc ? `<div class="field"><label>Hạng mục:</label><select class="ct-hangmuc">${hangMucOptions}</select></div>` : ''}
    <div class="grid-2">
      <div class="field"><label>Từ:</label>
        <input type="datetime-local" class="ct-tu" value="${tuDefault}" onchange="updatePreviewCT()"></div>
      <div class="field"><label>Đến:</label>
        <input type="datetime-local" class="ct-den" value="${denDefault}" onchange="updatePreviewCT()"></div>
    </div>
    <div class="chip-wrap">
      <div class="chip-tools">
        <button onclick="selectAllBlock('ctGrid_${id}')">✅ Tất cả</button>
        <button onclick="clearAllBlock('ctGrid_${id}')">❌ Bỏ</button>
        <button onclick="copyFromDCD(${id})">📋 Copy từ Đi</button>
      </div>
      <div class="chip-grid" id="ctGrid_${id}">${chipsHtml}</div>
      <div class="chip-info">Đã chọn: <b class="chip-count">0</b></div>
    </div>
  `;

  wrap.appendChild(div);
  updatePreviewCT();
}

function removeCongTac(id) {
  const el = document.getElementById('ctBlock_' + id);
  if (el) el.remove();
  STATE.ctBlocks = STATE.ctBlocks.filter(x => x !== id);
  updatePreviewCT();
}

function copyFromDCD(ctBlockId) {
  const dcdSelected = getSelectedChips('chipDCD');
  if (dcdSelected.length === 0) { toast('Chưa chọn ai ở "Di chuyển đi"', 'err'); return; }
  const grid = document.getElementById('ctGrid_' + ctBlockId);
  if (!grid) return;
  grid.querySelectorAll('.chip-nv').forEach(chip => {
    if (dcdSelected.includes(chip.dataset.uid)) chip.classList.add('selected');
  });
  const wrap = grid.closest('.chip-wrap');
  const cntEl = wrap ? wrap.querySelector('.chip-count') : null;
  if (cntEl) cntEl.textContent = dcdSelected.length;
  updatePreviewCT();
}

function collectCongTac() {
  const result = { diChuyenDi: null, congTac: [], diChuyenVe: null };

  if (document.getElementById('cbDiChuyenDi').checked) {
    const nguoi = getSelectedChips('chipDCD');
    const tu = document.getElementById('dcdTu').value;
    const den = document.getElementById('dcdDen').value;
    if (tu && den && nguoi.length > 0) result.diChuyenDi = { tu, den, nguoi };
  }

  document.querySelectorAll('#listCongTac .ct-block').forEach(block => {
    const grid = block.querySelector('.chip-grid');
    const nguoi = [];
    if (grid) grid.querySelectorAll('.chip-nv.selected').forEach(c => nguoi.push(c.dataset.uid));
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

  if (document.getElementById('cbDiChuyenVe').checked) {
    const nguoi = getSelectedChips('chipDCV');
    const tu = document.getElementById('dcvTu').value;
    const den = document.getElementById('dcvDen').value;
    if (tu && den && nguoi.length > 0) result.diChuyenVe = { tu, den, nguoi };
  }

  return result;
}

function updatePreviewCT() {
  const data = collectCongTac();
  const ngay = document.getElementById('fNgay').value;
  let tongGoc = 0, tongHeSo = 0;
  const dsNguoiAll = new Set();

  if (data.diChuyenDi) {
    const c = tinhChamCongJS(data.diChuyenDi.tu, data.diChuyenDi.den, ngay);
    tongGoc += c.gioGoc * data.diChuyenDi.nguoi.length;
    tongHeSo += c.gioGoc * data.diChuyenDi.nguoi.length;
    data.diChuyenDi.nguoi.forEach(n => dsNguoiAll.add(n));
  }
  data.congTac.forEach(ct => {
    const c = tinhChamCongJS(ct.tu, ct.den, ngay);
    tongGoc += c.gioGoc * ct.nguoi.length;
    tongHeSo += c.gioHeSo * ct.nguoi.length;
    ct.nguoi.forEach(n => dsNguoiAll.add(n));
  });
  if (data.diChuyenVe) {
    const c = tinhChamCongJS(data.diChuyenVe.tu, data.diChuyenVe.den, ngay);
    tongGoc += c.gioGoc * data.diChuyenVe.nguoi.length;
    tongHeSo += c.gioGoc * data.diChuyenVe.nguoi.length;
    data.diChuyenVe.nguoi.forEach(n => dsNguoiAll.add(n));
  }

  document.getElementById('previewCTText').textContent =
    dsNguoiAll.size + ' người • ' +
    (Math.round(tongGoc*10)/10) + 'h → ' + (Math.round(tongHeSo*10)/10) + 'h';
}

async function saveFormCT() {
  const loaiChinhEl = document.querySelector('input[name="loaiChinh"]:checked');
  if (!loaiChinhEl) { toast('Chưa chọn loại công tác', 'err'); return; }
  const ngay = document.getElementById('fNgay').value;
  if (!ngay) { toast('Chưa chọn ngày', 'err'); return; }

  const data = collectCongTac();
  if (data.congTac.length === 0) { toast('Chưa có công tác nào', 'err'); return; }

  if (['SCL','ĐTXD'].includes(loaiChinhEl.value)) {
    if (data.congTac.some(ct => !ct.hangMuc)) { toast('Chọn hạng mục cho tất cả công tác', 'err'); return; }
  }

  const soNguoi = new Set();
  data.congTac.forEach(ct => ct.nguoi.forEach(n => soNguoi.add(n)));
  if (!confirm('Lưu cho ' + soNguoi.size + ' người?')) return;

  showLoading(true);
  try {
    const r = await API.saveCongTac(STATE.token, { ngay, loaiChinh: loaiChinhEl.value, chiTiet: data });
    showLoading(false);
    if (r.ok) {
      toast('✅ ' + r.maCT + ' — ' + r.tongGioGoc + 'h → ' + r.tongGioHeSo + 'h', 'ok');
      setTimeout(() => { if (confirm('Nhập tiếp?')) resetFormCT(); }, 800);
    } else toast('❌ ' + r.msg, 'err');
  } catch(e) { showLoading(false); toast('❌ ' + e.message, 'err'); }
}

function resetFormCT() {
  document.querySelectorAll('input[name="loaiChinh"]').forEach(r => r.checked = false);
  document.getElementById('fieldHangMucCT').style.display = 'none';
  document.getElementById('cbDiChuyenDi').checked = false;
  document.getElementById('cbDiChuyenVe').checked = false;
  document.getElementById('blockDiChuyenDi').style.display = 'none';
  document.getElementById('blockDiChuyenVe').style.display = 'none';
  document.getElementById('listCongTac').innerHTML = '';
  STATE.ctBlocks = [];
  STATE.ctCounter = 0;
  clearAllBlock('chipDCD');
  clearAllBlock('chipDCV');
  updatePreviewCT();
}

// ============ TAB 1: NGHỈ ============
function updatePreviewNghi() {
  const tu = document.getElementById('nTuNgay').value;
  const den = document.getElementById('nDenNgay').value;
  const nguoi = getSelectedChips('chipNghi');
  let soNgay = 0;
  if (tu && den) {
    const d1 = new Date(tu + 'T00:00:00');
    const d2 = new Date(den + 'T00:00:00');
    soNgay = Math.floor((d2 - d1) / (24*60*60*1000)) + 1;
    if (soNgay < 0) soNgay = 0;
  }
  document.getElementById('previewNghiText').textContent =
    nguoi.length + ' người × ' + soNgay + ' ngày = ' + (nguoi.length * soNgay) + ' ngày công';
}

async function saveFormNghi() {
  const tu = document.getElementById('nTuNgay').value;
  const den = document.getElementById('nDenNgay').value;
  const loai = document.getElementById('nLoai').value;
  const lyDo = document.getElementById('nLyDo').value.trim();
  const nguoi = getSelectedChips('chipNghi');

  if (!tu || !den) { toast('Chưa chọn ngày', 'err'); return; }
  if (nguoi.length === 0) { toast('Chưa chọn người', 'err'); return; }

  if (!confirm('Lưu nghỉ ' + loai + ' cho ' + nguoi.length + ' người?')) return;
  showLoading(true);
  try {
    const r = await API.saveNghi(STATE.token, { dsNguoi: nguoi, tuNgay: tu, denNgay: den, loai, lyDo });
    showLoading(false);
    if (r.ok) {
      toast('✅ ' + r.tongNgayCong + ' ngày công', 'ok');
      setTimeout(() => { if (confirm('Nhập tiếp?')) resetFormNghi(); }, 800);
    } else toast('❌ ' + r.msg, 'err');
  } catch(e) { showLoading(false); toast('❌ ' + e.message, 'err'); }
}

function resetFormNghi() {
  const now = new Date();
  const ts = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  document.getElementById('nTuNgay').value = ts;
  document.getElementById('nDenNgay').value = ts;
  document.getElementById('nLoai').value = 'P';
  document.getElementById('nLyDo').value = '';
  clearAllBlock('chipNghi');
  updatePreviewNghi();
}

// ============ TAB 2: NGHỈ BÙ ============
function updatePreviewNghiBu() {
  const nguoi = getSelectedChips('chipNghiBu');
  const soGio = Number(document.getElementById('nbSoGio').value) || 0;
  const thang = document.getElementById('nbThangTruGio').value || '...';
  document.getElementById('previewNghiBuText').textContent =
    nguoi.length + ' người × ' + soGio + 'h (trừ ' + thang + ')';
}

async function saveFormNghiBu() {
  const tu = document.getElementById('nbTuNgay').value;
  const den = document.getElementById('nbDenNgay').value;
  const soGio = Number(document.getElementById('nbSoGio').value);
  const thangTruGio = document.getElementById('nbThangTruGio').value;
  const lyDo = document.getElementById('nbLyDo').value.trim();
  const nguoi = getSelectedChips('chipNghiBu');

  if (!tu || !den) { toast('Chưa chọn ngày', 'err'); return; }
  if (!thangTruGio) { toast('Chưa chọn tháng trừ', 'err'); return; }
  if (nguoi.length === 0) { toast('Chưa chọn người', 'err'); return; }

  if (!confirm('Lưu nghỉ bù ' + soGio + 'h cho ' + nguoi.length + ' người?\nTrừ vào ' + thangTruGio)) return;
  showLoading(true);
  try {
    const r = await API.saveNghiBu(STATE.token, { dsNguoi: nguoi, tuNgay: tu, denNgay: den, soGio, thangTruGio, lyDo });
    showLoading(false);
    if (r.ok) {
      toast('✅ Trừ ' + r.tongGioTru + 'h vào ' + thangTruGio, 'ok');
      setTimeout(() => { if (confirm('Nhập tiếp?')) resetFormNghiBu(); }, 800);
    } else toast('❌ ' + r.msg, 'err');
  } catch(e) { showLoading(false); toast('❌ ' + e.message, 'err'); }
}

function resetFormNghiBu() {
  const now = new Date();
  const ts = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  document.getElementById('nbTuNgay').value = ts;
  document.getElementById('nbDenNgay').value = ts;
  document.getElementById('nbSoGio').value = '8';
  document.getElementById('nbThangTruGio').value = ts.substring(0,7);
  document.getElementById('nbLyDo').value = '';
  clearAllBlock('chipNghiBu');
  updatePreviewNghiBu();
}

// ============ TAB 3: ĐỘC HẠI ============
async function saveFormDocHai() {
  const tu = document.getElementById('dhTuNgay').value;
  const den = document.getElementById('dhDenNgay').value;
  const mucDo = document.getElementById('dhMucDo').value;
  const ghiChu = document.getElementById('dhGhiChu').value.trim();
  const nguoi = getSelectedChips('chipDocHai');

  if (!tu || !den) { toast('Chưa chọn ngày', 'err'); return; }
  if (nguoi.length === 0) { toast('Chưa chọn người', 'err'); return; }

  const soNgay = Math.floor((new Date(den+'T00:00:00') - new Date(tu+'T00:00:00')) / (24*60*60*1000)) + 1;
  if (!confirm('Lưu độc hại ' + mucDo + ' cho ' + nguoi.length + ' người × ' + soNgay + ' ngày?')) return;

  showLoading(true);
  try {
    const r = await API.saveDocHai(STATE.token, { dsNguoi: nguoi, tuNgay: tu, denNgay: den, mucDo, ghiChu });
    showLoading(false);
    if (r.ok) {
      toast('✅ Đã lưu ' + r.soBan + ' bản ghi', 'ok');
      setTimeout(() => { if (confirm('Nhập tiếp?')) resetFormDocHai(); }, 800);
    } else toast('❌ ' + r.msg, 'err');
  } catch(e) { showLoading(false); toast('❌ ' + e.message, 'err'); }
}

function resetFormDocHai() {
  const now = new Date();
  const ts = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  document.getElementById('dhTuNgay').value = ts;
  document.getElementById('dhDenNgay').value = ts;
  document.getElementById('dhMucDo').value = 'DH';
  document.getElementById('dhGhiChu').value = '';
  clearAllBlock('chipDocHai');
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

    renderTongHopTable();
  } catch(e) { showLoading(false); toast('❌ ' + e.message, 'err'); }
}

function renderTongHopTable() {
  const d = STATE.tongHopData;
  const [yyyy, mm] = d.thang.split('-').map(Number);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();

  // Build dữ liệu theo userID × ngày
  // userData[uid][ngay] = { goc, heSo, ngay, dem, chiTiet[] }
  const userData = {};
  STATE.users.forEach(u => { userData[u.userID] = {}; });

  // Duyệt công tác
  d.congTac.forEach(ct => {
    const ngay = ct.ngay; // YYYY-MM-DD
    const c = ct.chiTiet || {};
    const dsNhom = [];
    if (c.diChuyenDi) dsNhom.push({ ...c.diChuyenDi, loai: 'diChuyen' });
    (c.congTac || []).forEach(g => dsNhom.push({ ...g, loai: 'thiCong' }));
    if (c.diChuyenVe) dsNhom.push({ ...c.diChuyenVe, loai: 'diChuyen' });

    dsNhom.forEach(nhom => {
      const tinh = tinhChamCongJS(nhom.tu, nhom.den, ngay);
      // Phân bổ giờ cho từng người
      nhom.nguoi.forEach(uid => {
        if (!userData[uid]) userData[uid] = {};
        if (!userData[uid][ngay]) userData[uid][ngay] = { goc: 0, heSo: 0, ngay: 0, dem: 0, scl: false, dtxd: false };
        const cell = userData[uid][ngay];
        if (nhom.loai === 'diChuyen') {
          cell.goc += tinh.gioGoc;
          cell.heSo += tinh.gioGoc;
        } else {
          cell.goc += tinh.gioGoc;
          cell.heSo += tinh.gioHeSo;
          // Đếm ngày/đêm — giờ đêm là 22:00-06:00
          const demGio = demGio(nhom.tu, nhom.den);
          cell.ngay += tinh.gioGoc - demGio;
          cell.dem += demGio;
        }
        if (nhom.hangMuc && nhom.hangMuc.startsWith('SCL')) cell.scl = true;
        if (nhom.hangMuc && nhom.hangMuc.startsWith('ĐTXD')) cell.dtxd = true;
      });
    });
  });

  // Nghỉ
  d.nghi.forEach(n => {
    const uid = n.nguoi;
    if (!userData[uid]) userData[uid] = {};
    const d1 = new Date(n.tuNgay + 'T00:00:00');
    const d2 = new Date(n.denNgay + 'T00:00:00');
    for (let dd = new Date(d1); dd <= d2; dd.setDate(dd.getDate() + 1)) {
      const ngay = fmtDateJS(dd);
      if (!userData[uid][ngay]) userData[uid][ngay] = { goc: 0, heSo: 0, ngay: 0, dem: 0, nghi: n.loai };
      userData[uid][ngay].nghi = n.loai;
    }
  });

  // Độc hại
  const docHaiMap = {};
  d.docHai.forEach(dh => {
    const k = dh.nguoi + '_' + dh.ngay;
    docHaiMap[k] = dh.mucDo;
  });

  // Render bảng
  let html = '<div class="th-wrap"><table class="th-table"><thead><tr>';
  html += '<th class="th-stt">TT</th>';
  html += '<th class="th-name">Họ và tên</th>';
  for (let i = 1; i <= daysInMonth; i++) html += '<th class="th-day">' + i + '</th>';
  html += '<th class="th-sum">Tổng gốc</th>';
  html += '<th class="th-sum">Tổng HS</th>';
  html += '<th class="th-sum">Thêm giờ</th>';
  html += '<th class="th-sum">Đã bù</th>';
  html += '<th class="th-sum">Còn lại</th>';
  html += '</tr></thead><tbody>';

  // Nghỉ bù theo user
  const nghiBuMap = {};
  d.nghiBu.forEach(nb => {
    if (!nghiBuMap[nb.nguoi]) nghiBuMap[nb.nguoi] = 0;
    nghiBuMap[nb.nguoi] += nb.soGio || 0;
  });

  STATE.users.forEach((u, idx) => {
    html += '<tr>';
    html += '<td class="th-stt">' + (idx + 1) + '</td>';
    html += '<td class="th-name">' + u.hoTen + '</td>';

    let tongGoc = 0, tongHS = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const ngayStr = yyyy + '-' + String(mm).padStart(2,'0') + '-' + String(i).padStart(2,'0');
      const cell = userData[u.userID] && userData[u.userID][ngayStr];

      let cls = '';
      let txt = '';
      if (cell) {
        if (cell.nghi) {
          cls = 'nghi';
          txt = cell.nghi;
        } else {
          const goc = Math.round(cell.goc * 10) / 10;
          const hs = Math.round(cell.heSo * 10) / 10;
          txt = goc + '/' + hs;
          if (cell.scl) cls = 'scl';
          else if (cell.dtxd) cls = 'dtxd';
          else if (goc > 0) cls = 'has-data';
          tongGoc += cell.goc;
          tongHS += cell.heSo;
        }
      }
      // Độc hại override
      const dhKey = u.userID + '_' + ngayStr;
      if (docHaiMap[dhKey]) {
        cls = 'le';
        txt = docHaiMap[dhKey] + (txt ? ' ' + txt : '');
      }

      html += '<td class="' + cls + '">' + txt + '</td>';
    }

    // Tính thêm giờ = tổng gốc - (số ngày có công tác × 8h)
    const soNgayLamViec = Object.keys(userData[u.userID] || {}).filter(k =>
      userData[u.userID][k].goc > 0 && !userData[u.userID][k].nghi
    ).length;
    const themGio = Math.max(0, Math.round((tongGoc - soNgayLamViec * 8) * 10) / 10);
    const daBu = Math.round((nghiBuMap[u.userID] || 0) * 10) / 10;
    const conLai = Math.round((themGio - daBu) * 10) / 10;

    html += '<td class="th-sum">' + (Math.round(tongGoc*10)/10) + '</td>';
    html += '<td class="th-sum">' + (Math.round(tongHS*10)/10) + '</td>';
    html += '<td class="th-sum">' + themGio + '</td>';
    html += '<td class="th-sum">' + daBu + '</td>';
    html += '<td class="th-sum" style="background:' + (conLai > 0 ? '#c8e6c9' : '#ffcdd2') + '">' + conLai + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  html += '<div style="font-size:12px; color:#666; margin-top:8px; padding:8px; background:#f5f5f5; border-radius:6px">';
  html += '📌 <b>Ghi chú:</b> Ô có dạng "Gốc/HS" = giờ gốc / giờ đã nhân hệ số. Màu cam = SCL, đỏ đậm = ĐTXD, hồng = độc hại.';
  html += '</div>';

  document.getElementById('tongHopWrap').innerHTML = html;
}

function demGio(tu, den) {
  // Đếm số giờ rơi vào khung 22:00 - 06:00 hôm sau
  const t1 = toMin(tu);
  let t2 = toMin(den);
  if (t2 <= t1) t2 += 24 * 60;
  let dem = 0;
  for (let m = t1; m < t2; m++) {
    const m24 = m % 1440;
    if (m24 >= 1320 || m24 < 360) dem++;
  }
  return Math.round(dem / 6) / 10;
}

// ============ XUẤT EXCEL ============
function exportExcel() {
  if (!STATE.tongHopData) { toast('Bấm "Tải dữ liệu" trước', 'err'); return; }
  if (typeof XLSX === 'undefined') { toast('Chưa tải SheetJS. F5 lại', 'err'); return; }

  const d = STATE.tongHopData;
  const [yyyy, mm] = d.thang.split('-').map(Number);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();

  // Sheet 1: Công tác chi tiết
  const ws1 = [['Mã CT', 'Ngày', 'Loại', 'Chi tiết', 'Tổng gốc', 'Tổng HS']];
  d.congTac.forEach(ct => {
    let ctStr = '';
    const c = ct.chiTiet || {};
    if (c.diChuyenDi) ctStr += 'Đi:' + c.diChuyenDi.tu.split('T')[1] + '-' + c.diChuyenDi.den.split('T')[1] + '(' + c.diChuyenDi.nguoi.length + '); ';
    (c.congTac || []).forEach(g => ctStr += (g.hangMuc || g.loaiCT) + ':' + g.tu.split('T')[1] + '-' + g.den.split('T')[1] + '(' + g.nguoi.length + '); ');
    if (c.diChuyenVe) ctStr += 'Về:' + c.diChuyenVe.tu.split('T')[1] + '-' + c.diChuyenVe.den.split('T')[1] + '(' + c.diChuyenVe.nguoi.length + ')';
    ws1.push([ct.maCT, ct.ngay, ct.loaiChinh, ctStr, ct.tongGioGoc, ct.tongGioHeSo]);
  });

  // Sheet 2: Nghỉ
  const ws2 = [['ID', 'Người', 'Từ', 'Đến', 'Số ngày', 'Loại', 'Lý do']];
  d.nghi.forEach(n => ws2.push([n.id, n.nguoi, n.tuNgay, n.denNgay, n.soNgay, n.loai, n.lyDo]));

  // Sheet 3: Nghỉ bù
  const ws3 = [['ID', 'Người', 'Từ', 'Đến', 'Số giờ', 'Tháng trừ', 'Lý do']];
  d.nghiBu.forEach(n => ws3.push([n.id, n.nguoi, n.tuNgay, n.denNgay, n.soGio, n.thangTruGio, n.lyDo]));

  // Sheet 4: Độc hại
  const ws4 = [['ID', 'Người', 'Ngày', 'Mức độ', 'Ghi chú']];
  d.docHai.forEach(x => ws4.push([x.id, x.nguoi, x.ngay, x.mucDo, x.ghiChu]));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws1), 'CongTac');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws2), 'Nghi');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws3), 'NghiBu');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws4), 'DocHai');
  XLSX.writeFile(wb, 'CongTac_' + d.thang + '.xlsx');
  toast('✅ Đã xuất CongTac_' + d.thang + '.xlsx', 'ok');
}

// ============ HELPERS ============
function tinhChamCongJS(tuDatetime, denDatetime, ngayStr) {
  if (!tuDatetime || !denDatetime || !ngayStr) return { gioGoc: 0, gioHeSo: 0 };
  const loaiNgay = xacDinhLoaiNgayJS(ngayStr);
  const t1 = toMin(tuDatetime);
  let t2 = toMin(denDatetime);
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
  return { gioGoc: Math.round(gioGoc*10)/10, gioHeSo: Math.round(gioHeSo*10)/10 };
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
    return (midNgay >= 1320 || midNgay < 360) ? 'DEM_TOAN' : 'NGAY_TOAN';
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
  const p = s.split(':');
  return (Number(p[0])||0)*60 + (Number(p[1])||0);
}

function fmtDateJS(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

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
