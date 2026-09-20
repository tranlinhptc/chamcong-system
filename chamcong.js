// =====================================================
// CHAMCONG.JS - Logic bảng chấm công
// =====================================================

// ============ CẤU HÌNH ============
const CFG_FE = {
  GIO_HC_SANG:  ['07:00', '11:30'],
  GIO_HC_CHIEU: ['13:30', '17:00'],
  MOC_DEM:      '22:00',
  MOC_NGAY:     '06:00',
  GIO_CHUAN:    8
};

// 27 ký hiệu chấm công
const KY_HIEU = [
  // --- Làm việc ---
  { ma: '+',      ten: 'Công SXKD giờ HC',         nhom: 'plus' },
  { ma: 'C1',     ten: 'Ca 1 (00h-14h)',            nhom: 'ca' },
  { ma: 'C2',     ten: 'Ca 2 (14h-22h)',            nhom: 'ca' },
  { ma: 'C3',     ten: 'Ca 3 (22h-06h hôm sau)',    nhom: 'ca' },

  // --- Công tác ---
  { ma: 'ct',     ten: 'Công tác',                  nhom: 'ct' },
  { ma: 'CT1',    ten: 'Công tác đi về trong ngày', nhom: 'ct' },
  { ma: 'CT2',    ten: 'Công tác ≥ 2 ngày',         nhom: 'ct' },

  // --- Công trình ---
  { ma: 'SCL',    ten: 'Sửa chữa lớn (chọn mã)',    nhom: 'scl' },
  { ma: 'ĐTXD',   ten: 'Đầu tư XD (chọn mã)',       nhom: 'dtxd' },
  { ma: 'SXKD',   ten: 'Sản xuất kinh doanh',       nhom: 'plus' },
  { ma: 'SCTX',   ten: 'Sửa chữa thường xuyên',     nhom: 'plus' },

  // --- Học tập ---
  { ma: 'H1',     ten: 'Học tập < 1 tháng',         nhom: 'hoc' },
  { ma: 'H2',     ten: 'Học tập > 1 tháng (VN)',    nhom: 'hoc' },
  { ma: 'H3',     ten: 'Học tập nước ngoài',        nhom: 'hoc' },

  // --- Nghỉ ---
  { ma: 'L',      ten: 'Nghỉ lễ, Tết',              nhom: 'le' },
  { ma: 'BL',     ten: 'Nghỉ bù lễ',                nhom: 'le' },
  { ma: 'NB',     ten: 'Nghỉ bù',                   nhom: 'nghi' },
  { ma: 'P',      ten: 'Nghỉ phép',                 nhom: 'nghi' },
  { ma: 'Ô',      ten: 'Nghỉ ốm',                   nhom: 'nghi' },
  { ma: 'NM',     ten: 'Nghỉ mát',                  nhom: 'nghi' },
  { ma: 'R',      ten: 'Nghỉ việc riêng có lương',  nhom: 'nghi' },
  { ma: 'KL',     ten: 'Nghỉ không lương',          nhom: 'khac' },
  { ma: 'NKL',    ten: 'Nghỉ việc không lương',     nhom: 'khac' },
  { ma: 'Ko',     ten: 'Nghỉ không lý do',          nhom: 'khac' },
  { ma: 'N',      ten: 'Ngày công nghỉ việc',       nhom: 'khac' },

  // --- Khác ---
  { ma: 'DD',     ten: 'Điều dưỡng PHCN',           nhom: 'khac' },
  { ma: 'AT1',    ten: 'ATĐ mức 15%',               nhom: 'khac' },
  { ma: 'AT2',    ten: 'ATĐ mức 20%',               nhom: 'khac' },
  { ma: 'T',      ten: 'Nghỉ tai nạn LĐ',           nhom: 'nghi' },
  { ma: 'TSn',    ten: 'Nghỉ thai sản',             nhom: 'nghi' },
  { ma: 'Cô',     ten: 'Nghỉ con ốm',               nhom: 'nghi' },
  { ma: 'CBsx',   ten: 'Chuẩn bị sản xuất',         nhom: 'khac' }
];

// ============ STATE ============
const STATE = {
  token: null,
  user: null,
  users: [],
  chamCong: {},     // { "nv01": { "2026-09-15": {...} } }
  ngayDacBiet: [],
  thang: '',
  currentCell: null, // { userID, ngay, cellEl }
  dirtyCells: new Set() // "userID_ngay"
};

// ============ KHỞI TẠO ============
async function init() {
  STATE.token = sessionStorage.getItem('token');
  if (!STATE.token) {
    location.href = 'index.html';
    return;
  }

  const userJson = sessionStorage.getItem('user');
  if (userJson) STATE.user = JSON.parse(userJson);

  // Kiểm tra token còn hạn
  const r = await API.getUserInfo(STATE.token);
  if (!r.ok) {
    sessionStorage.clear();
    location.href = 'index.html';
    return;
  }
  STATE.user = r.user;
  sessionStorage.setItem('user', JSON.stringify(r.user));

  renderUserInfo();
  renderRoleBadge();

  // Set tháng hiện tại
  const now = new Date();
  const yyyymm = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('monthPicker').value = yyyymm;
  STATE.thang = yyyymm;

  // Load users + dữ liệu
  await loadUsers();
  await loadMonth();

  renderLegend();
  renderKyHieuDropdown();
}

function renderUserInfo() {
  document.getElementById('userInfo').textContent =
    '👤 ' + STATE.user.hoTen + ' (' + STATE.user.vaiTro + ')';
}

function renderRoleBadge() {
  const isApprover = STATE.user.vaiTro === 'approver';
  const badge = document.getElementById('roleBadge');
  badge.className = 'badge ' + (isApprover ? 'approver' : 'user');
  badge.textContent = isApprover ? 'Quản lý' : 'Nhân viên';

  document.getElementById('hintText').textContent = isApprover
    ? '✅ Bạn có quyền chấm công. Click vào ô để nhập.'
    : '👁 Bạn chỉ có thể xem. Chỉ A/B mới được sửa chấm công.';
}

// ============ LOAD DATA ============
async function loadUsers() {
  const r = await API.getUsers(STATE.token);
  if (!r.ok) {
    alert('Lỗi tải users: ' + r.msg);
    return;
  }
  STATE.users = r.users;
}

async function loadMonth() {
  const picker = document.getElementById('monthPicker');
  const thang = picker.value;
  if (!thang) return;

  console.log('🔵 loadMonth:', thang);

  // Clear state
  STATE.thang = thang;
  STATE.chamCong = {};
  STATE.ngayDacBiet = [];
  STATE.dirtyCells.clear();
  updateSaveButton();

  // Hiện loading
  document.getElementById('tableBody').innerHTML =
    '<tr><td colspan="40" class="loading">⏳ Đang tải tháng ' + thang + '...</td></tr>';

  try {
    const [r1, r2] = await Promise.all([
      API.getChamCong(STATE.token, thang),
      API.getNgayDacBiet(STATE.token, thang)
    ]);

    if (!r1.ok || !r2.ok) {
      alert('Lỗi tải dữ liệu');
      return;
    }

    // Build state
r1.items.forEach(it => {
  const uID = it.maBC.split('_')[1];
  const ngayKey = normalizeNgay(it.ngay);
  if (!STATE.chamCong[uID]) STATE.chamCong[uID] = {};
  STATE.chamCong[uID][ngayKey] = {
    kyHieu:      it.loai || '',           // ✅ MAP: loai → kyHieu
    gioBatDau:   it.tuGio || '',          // ✅ MAP: tuGio → gioBatDau
    gioKetThuc:  it.denGio || '',         // ✅ MAP: denGio → gioKetThuc
    congTrinh:   it.congTrinh || '',
    soGio:       it.soGio || 0,
    gioGoc:      it.gioGoc || 0,
    gioHeSo:     it.gioHeSo || 0,
    moTa:        it.moTa || '',
    ngay:        ngayKey
  };
});

    STATE.ngayDacBiet = r2.items || [];

    console.log('✅ Loaded:', thang, '-', r1.items.length, 'rows');
    renderTable();
    setStatus('✅ Đã tải tháng ' + thang, 'ok');
  } catch(e) {
    console.error('❌', e);
    alert('Lỗi: ' + e.message);
  }
}

// ============ RENDER TABLE ============
function renderTable() {
  const thang = STATE.thang; // "2026-09"
  const [yyyy, mm] = thang.split('-').map(Number);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();

  renderHeader(daysInMonth, yyyy, mm);
  renderBody(daysInMonth, yyyy, mm);
  renderFooter(daysInMonth);
}

function renderHeader(daysInMonth, yyyy, mm) {
  const thead = document.getElementById('tableHead');
  let html = '';

  const colsTotal = 4 + daysInMonth + 24;

  // === Row 1-3: Tên công ty/đội/tổ ===
  html += '<tr class="title-row"><th colspan="' + colsTotal + '" class="left" style="background:#1565c0; color:white; padding:8px; font-size:14px">CÔNG TY TRUYỀN TẢI ĐIỆN 3</th></tr>';
  html += '<tr class="title-row"><th colspan="' + colsTotal + '" class="left" style="background:#1976d2; color:white;">ĐỘI SỬA CHỮA THÍ NGHIỆM ĐIỆN 3</th></tr>';
  html += '<tr class="title-row"><th colspan="' + colsTotal + '" class="left" style="background:#1e88e5; color:white;">TỔ THÍ NGHIỆM ĐIỆN LÂM ĐỒNG</th></tr>';

  // === Row 4: Tên bảng ===
  html += '<tr class="sub-title"><th colspan="' + colsTotal + '" style="font-size:16px; padding:10px;">BẢNG CHẤM CÔNG - Tháng ' + mm + ' năm ' + yyyy + '</th></tr>';

  // === Row 5: Info ===
  html += '<tr class="sub-title"><th colspan="' + colsTotal + '" style="padding:6px; font-size:12px; font-weight:normal">Số ngày trong tháng: ' + daysInMonth + ' | Nhân viên: ' + STATE.users.length + '</th></tr>';

  // === Row 6: Header chính ===
  html += '<tr class="day-header">';
  html += '<th rowspan="2" class="stt-col" style="min-width:36px">TT</th>';
  html += '<th rowspan="2" class="name-col" style="min-width:160px; text-align:left; padding-left:8px">Họ và tên</th>';
  html += '<th rowspan="2" style="min-width:50px">Mã NV</th>';
  html += '<th rowspan="2" style="min-width:60px">Chức danh</th>';
  html += '<th colspan="' + daysInMonth + '" style="background:#1a73e8">Ngày trong tháng</th>';
  html += '<th colspan="24" style="background:#f57c00">Quy ra công</th>';
  html += '</tr>';

  // === Row 7: Số ngày + Thứ ===
  const today = new Date();
  const todayStr = today.getFullYear() + '-' +
    String(today.getMonth()+1).padStart(2,'0') + '-' +
    String(today.getDate()).padStart(2,'0');

  html += '<tr class="thu-header">';
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(yyyy, mm-1, d);
    const thu = date.getDay(); // 0=CN
    const ngayStr = yyyy + '-' + String(mm).padStart(2,'0') + '-' + String(d).padStart(2,'0');

    // Xác định loại ngày
    const db = STATE.ngayDacBiet.find(x => x.ngay === ngayStr);
    let bgColor = '#64b5f6';
    let cls = '';
    if (db) {
      if (db.loai === 'Le') { bgColor = '#c62828'; cls = 'le'; }
      else if (db.loai === 'T7Bu') { bgColor = '#78909c'; cls = 'bu'; }
    } else if (thu === 0) { bgColor = '#ef5350'; cls = 'cn'; }
    else if (thu === 6) { bgColor = '#ff9800'; cls = 't7'; }

    if (ngayStr === todayStr) cls += ' today';

    html += '<th class="' + cls + '" style="background:' + bgColor + '" title="' + ngayStr + '">' + d + '</th>';
  }

  // 24 cột QRC
  const qrcNames = [
    'Tổng công', 'SXKD', 'Lễ phép', 'Chờ việc', 'Học tập', 'Công tác',
    'Nghỉ bù', 'Nghỉ ốm', 'KL', 'Nghỉ bù 2', 'ĐD PHCN', 'SCL',
    'AT', 'CĐ', 'TĐ', 'TNLĐ', 'Nghỉ mát', 'Thai sản',
    'Con ốm', 'Riêng', 'NKL', 'Ko lý do', 'Nghỉ việc', 'Ghi chú'
  ];
  qrcNames.forEach((name, i) => {
    html += '<th class="group-header" title="' + name + '">' + (i+1) + '</th>';
  });
  html += '</tr>';

  thead.innerHTML = html;
}
function renderBody(daysInMonth, yyyy, mm) {
  const tbody = document.getElementById('tableBody');
  const isApprover = STATE.user.vaiTro === 'approver';
  let html = '';

  const today = new Date();
  const todayStr = today.getFullYear() + '-' +
    String(today.getMonth()+1).padStart(2,'0') + '-' +
    String(today.getDate()).padStart(2,'0');

  STATE.users.forEach((u, idx) => {
    html += '<tr>';
    html += '<td class="stt-cell">' + (idx + 1) + '</td>';
    html += '<td class="name-cell">' + u.hoTen + '</td>';
    html += '<td class="ma-cell">' + u.userID + '</td>';
    html += '<td class="chucdanh-cell">' + u.username + '</td>';

    // === 31 ô ngày ===
    for (let d = 1; d <= daysInMonth; d++) {
      const ngayStr = yyyy + '-' + String(mm).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      const cellData = getCellData(u.userID, ngayStr);
      const kyHieu = cellData ? cellData.kyHieu : '';
      const nhom = getNhom(kyHieu);

      const isEditable = isApprover ? 'editable' : '';
      const kyClass = kyHieu ? 'ky-' + nhom : '';

      // Xác định class ngày đặc biệt
      let ngayCls = '';
      const db = STATE.ngayDacBiet.find(x => x.ngay === ngayStr);
      if (db) {
        ngayCls = db.loai === 'Le' ? 'ngay-le' : 'ngay-bu';
      } else {
        const dateObj = new Date(ngayStr + 'T00:00:00');
        if (dateObj.getDay() === 0) ngayCls = 'ngay-cn';
        else if (dateObj.getDay() === 6) ngayCls = 'ngay-t7';
      }
      if (ngayStr === todayStr) ngayCls += ' today';

      html += '<td class="day-cell ' + isEditable + ' ' + kyClass + ' ' + ngayCls + '"' +
              ' data-uid="' + u.userID + '"' +
              ' data-ngay="' + ngayStr + '"' +
              ' onclick="onCellClick(this)"' +
              ' title="' + getTooltip(cellData).replace(/"/g, '&quot;') + '">' +
              (kyHieu || '') + '</td>';
    }

    // === 24 cột QRC ===
    const qrc = calcQRC(u.userID, daysInMonth, yyyy, mm);
    for (let i = 0; i < 23; i++) {
      html += '<td class="qrc-col">' + (qrc[i] || '') + '</td>';
    }
    html += '<td class="qrc-col note"></td>';
    html += '</tr>';
  });

  tbody.innerHTML = html;
}

function renderFooter(daysInMonth) {
  const tfoot = document.getElementById('tableFoot');
  let html = '<tr>';
  html += '<td colspan="4" class="label">TỔNG CỘNG:</td>';

  // Tổng từng ngày
  for (let d = 1; d <= daysInMonth; d++) {
    let count = 0;
    STATE.users.forEach(u => {
      const ngayStr = `${STATE.thang}-${String(d).padStart(2,'0')}`;
      const c = getCellData(u.userID, ngayStr);
      if (c && c.kyHieu && !isNghi(c.kyHieu)) count++;
    });
    html += `<td>${count || ''}</td>`;
  }

  // Tổng QRC
  const totalQRC = new Array(24).fill(0);
  STATE.users.forEach(u => {
    const qrc = calcQRC(u.userID, daysInMonth,
      Number(STATE.thang.split('-')[0]),
      Number(STATE.thang.split('-')[1]));
    for (let i = 0; i < 24; i++) {
      if (typeof qrc[i] === 'number') totalQRC[i] += qrc[i];
    }
  });
  for (let i = 0; i < 23; i++) {
    html += `<td>${totalQRC[i] || ''}</td>`;
  }
  html += '<td></td>';
  html += '</tr>';
  tfoot.innerHTML = html;
}

// ============ HELPERS ============
function getCellData(userID, ngayStr) {
  return (STATE.chamCong[userID] && STATE.chamCong[userID][ngayStr]) || null;
}

function getNhom(kyHieu) {
  if (!kyHieu) return 'khac';
  const k = KY_HIEU.find(x => x.ma === kyHieu);
  if (k) return k.nhom;
  if (kyHieu.startsWith('SCL')) return 'scl';
  if (kyHieu.startsWith('ĐTXD')) return 'dtxd';
  return 'khac';
}

function isNghi(ky) {
  return ['L','BL','NB','P','Ô','NM','R','KL','NKL','Ko','N','T','TSn','Cô'].includes(ky);
}

function getTooltip(cellData) {
  if (!cellData) return 'Chưa chấm công';
  let tip = cellData.kyHieu || '';
  if (cellData.gioBatDau) tip += ' | ' + cellData.gioBatDau + '-' + cellData.gioKetThuc;
  if (cellData.congTrinh) tip += ' | CT: ' + cellData.congTrinh;
  if (cellData.moTa) tip += '\n' + cellData.moTa;
  return tip;
}

// ============ TÍNH QRC (đơn giản hóa — bước 2.3 sẽ hoàn thiện) ============
function calcQRC(userID, daysInMonth, yyyy, mm) {
  const qrc = new Array(24).fill(0);
  let sclGio = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const ngayStr = yyyy + '-' + String(mm).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const c = getCellData(userID, ngayStr);
    if (!c || !c.kyHieu) continue;

    const ky = c.kyHieu;

    // Cột 1: Tổng công (đếm ngày)
    if (!isNghi(ky) && ky !== 'Ko' && ky !== 'N') qrc[0]++;

    // Mapping
    if (ky === '+') qrc[1]++;
    else if (['L','P','BL'].includes(ky)) qrc[2]++;
    else if (ky === 'CBsx') qrc[3]++;
    else if (['H1','H2','H3'].includes(ky)) qrc[4]++;
    else if (ky === 'ct' || ky === 'CT1' || ky === 'CT2') qrc[5]++;
    else if (ky === 'NB') qrc[6]++;
    else if (ky === 'Ô') qrc[7]++;
    else if (ky === 'KL') qrc[8]++;
    else if (['DD'].includes(ky)) qrc[10]++;
    else if (ky.startsWith('SCL')) {
      // Cột 12 (index 11) = tổng giờ SCL
      sclGio += (c.soGio || 0);
    }
    else if (['AT1','AT2'].includes(ky)) qrc[12]++;
    else if (ky === 'CĐ') qrc[13]++;
    else if (ky === 'TĐ') qrc[14]++;
    else if (ky === 'T') qrc[15]++;
    else if (ky === 'NM') qrc[16]++;
    else if (ky === 'TSn') qrc[17]++;
    else if (ky === 'Cô') qrc[18]++;
    else if (ky === 'R') qrc[19]++;
    else if (ky === 'NKL') qrc[20]++;
    else if (ky === 'Ko') qrc[21]++;
    else if (ky === 'N') qrc[22]++;
  }

  qrc[11] = Math.round(sclGio * 10) / 10;
  return qrc;
}

// ============ POPUP CHẤM CÔNG ============
function onCellClick(td) {
  if (STATE.user.vaiTro !== 'approver') {
    return; // user thường chỉ xem
  }

  const uid = td.dataset.uid;
  const ngay = td.dataset.ngay;
  STATE.currentCell = { userID: uid, ngay, cellEl: td };

  const cellData = getCellData(uid, ngay);
  const user = STATE.users.find(u => u.userID === uid);

  document.getElementById('modalTitle').textContent =
    `Chấm công: ${user.hoTen} — ${formatDate(ngay)}`;

  document.getElementById('fKyHieu').value = cellData ? cellData.kyHieu : '+';
  document.getElementById('fTuGio').value = cellData?.gioBatDau || '08:00';
  document.getElementById('fDenGio').value = cellData?.gioKetThuc || '17:00';
  document.getElementById('fCongTrinh').value = cellData?.congTrinh || '';
  document.getElementById('fMoTa').value = cellData?.moTa || '';

  document.getElementById('btnDelete').style.display = cellData ? 'inline-block' : 'none';

  onKyHieuChange();
  document.getElementById('modalOverlay').classList.add('show');
}

function onKyHieuChange() {
  const ky = document.getElementById('fKyHieu').value;
  const nhom = getNhom(ky);
  const needTime = ['SCL', 'ĐTXD', 'SXKD', 'SCTX', 'ct', 'CT1', 'CT2'].includes(ky);
  const needCT = ['SCL', 'ĐTXD', 'SXKD', 'SCTX'].includes(ky);

  document.getElementById('fieldTimeRow').style.display = needTime ? 'grid' : 'none';
  document.getElementById('fieldCongTrinhRow').style.display = needCT ? 'block' : 'none';

  updateCalcPreview();
}

function updateCalcPreview() {
  const ky = document.getElementById('fKyHieu').value;
  const tu = document.getElementById('fTuGio').value;
  const den = document.getElementById('fDenGio').value;
  const preview = document.getElementById('calcPreview');

  const needTime = ['SCL', 'ĐTXD', 'SXKD', 'SCTX', 'ct', 'CT1', 'CT2'].includes(ky);

  if (!needTime) {
    preview.innerHTML = `<b>Ký hiệu:</b> ${ky} — ${getTenKyHieu(ky)}`;
    return;
  }

  // Dùng JS tính giờ (đồng bộ với Calculator.gs)
  const cell = STATE.currentCell;
  const ngayStr = cell ? cell.ngay : new Date().toISOString().slice(0,10);

  const calc = tinhChamCongJS(tu, den, ngayStr);

  preview.innerHTML = `
    <b>Kết quả tính:</b> (${calc.loaiNgay})<br>
    ${calc.chiTiet.map(s =>
      `• ${s.tu} - ${s.den}: <b>${s.soGio}h</b> × ${s.heSo} = ${Math.round(s.soGio*s.heSo*10)/10}h`
    ).join('<br>')}
    <hr style="margin:6px 0; border:none; border-top:1px dashed #90caf9">
    • <b>Tổng gốc: ${calc.gioGoc}h → Hệ số: ${calc.gioHeSo}h</b>
  `;
}

/**
 * JS version của Calculator.gs
 */
function tinhChamCongJS(tuGio, denGio, ngayStr) {
  const HE_SO = {
    T2_T6: { hc: 1.0, trua: 1.2, ngoaiNgay: 1.5, dem: 1.7 },
    T7:    { ngay: 2.0, dem: 2.5 },
    CN:    { ngay: 2.0, dem: 2.5 },
    LE:    { ngay: 3.0, dem: 3.5 },
    BU:    { hc: 1.0, trua: 1.2, ngoaiNgay: 1.5, dem: 1.7 }
  };

  const loaiNgay = xacDinhLoaiNgayJS(ngayStr);
  const t1 = toMinJS(tuGio);
  let t2 = toMinJS(denGio);
  if (t2 <= t1) t2 += 24 * 60;

  const mocCat = [t1];
  [360, 420, 690, 810, 1020, 1320, 1440, 1800, 2160].forEach(m => {
    if (m > t1 && m < t2) mocCat.push(m);
  });
  mocCat.push(t2);
  mocCat.sort((a, b) => a - b);

  const chiTiet = [];
  let gioGoc = 0, gioHeSo = 0;

  for (let i = 0; i < mocCat.length - 1; i++) {
    const a = mocCat[i];
    const b = mocCat[i + 1];
    const soGio = Math.round((b - a) / 6) / 10;
    const phanLoai = phanLoaiJS(a, b, loaiNgay);
    const heSo = layHeSoJS(phanLoai, loaiNgay);
    chiTiet.push({
      tu: minToHHMMJS(a), den: minToHHMMJS(b),
      soGio, phanLoai, heSo
    });
    gioGoc += soGio;
    gioHeSo += soGio * heSo;
  }

  return {
    loaiNgay,
    gioGoc: Math.round(gioGoc * 10) / 10,
    gioHeSo: Math.round(gioHeSo * 10) / 10,
    chiTiet
  };
}

function xacDinhLoaiNgayJS(ngayStr) {
  // Check Lễ
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
  const mid = (a + b) / 2;
  const midNgay = mid % 1440;

  if (['T7','CN','LE'].includes(loaiNgay)) {
    const isDem = midNgay >= 1320 || midNgay < 360;
    return isDem ? 'DEM_TOAN' : 'NGAY_TOAN';
  }
  if (midNgay >= 1320 || midNgay < 360) return 'DEM';
  if ((midNgay >= 420 && midNgay < 690) ||
      (midNgay >= 810 && midNgay < 1020)) return 'HC';
  if (midNgay >= 690 && midNgay < 810) return 'TRUA';
  return 'NGOAI_NGAY';
}

function layHeSoJS(pl, loaiNgay) {
  const HE_SO = {
    T2_T6: { hc: 1.0, trua: 1.2, ngoaiNgay: 1.5, dem: 1.7 },
    T7:    { ngay: 2.0, dem: 2.5 },
    CN:    { ngay: 2.0, dem: 2.5 },
    LE:    { ngay: 3.0, dem: 3.5 },
    BU:    { hc: 1.0, trua: 1.2, ngoaiNgay: 1.5, dem: 1.7 }
  };
  if (loaiNgay === 'LE') return pl === 'DEM_TOAN' ? 3.5 : 3.0;
  if (['T7','CN'].includes(loaiNgay)) return pl === 'DEM_TOAN' ? 2.5 : 2.0;
  const b = loaiNgay === 'BU' ? HE_SO.BU : HE_SO.T2_T6;
  if (pl === 'HC') return b.hc;
  if (pl === 'TRUA') return b.trua;
  if (pl === 'NGOAI_NGAY') return b.ngoaiNgay;
  if (pl === 'DEM') return b.dem;
  return 1.0;
}

function toMinJS(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function minToHHMMJS(m) {
  const mm = m % 1440;
  return String(Math.floor(mm/60)).padStart(2,'0') + ':' +
         String(mm%60).padStart(2,'0');
}

function getTenKyHieu(ma) {
  const k = KY_HIEU.find(x => x.ma === ma);
  return k ? k.ten : ma;
}

// ============ TÍNH GIỜ (đơn giản hóa) ============
function tinhGio(tu, den) {
  const t1 = toMinutes(tu);
  let t2 = toMinutes(den);
  if (t2 <= t1) t2 += 24 * 60; // qua đêm
  const total = t2 - t1;

  // Khung HC
  const hcSang = [toMinutes('07:00'), toMinutes('11:30')];
  const hcChieu = [toMinutes('13:30'), toMinutes('17:00')];

  // Tách giờ HC vs ngoài HC (đơn giản hóa)
  let hc = 0, ngoai = 0, dem = 0;

  for (let m = t1; m < t2; m++) {
    const m24 = m % (24 * 60);
    const isDem = (m24 >= toMinutes('22:00')) || (m24 < toMinutes('06:00'));
    const isHC = (m24 >= hcSang[0] && m24 < hcSang[1]) ||
                 (m24 >= hcChieu[0] && m24 < hcChieu[1]);
    if (isDem) dem++;
    else if (isHC) hc++;
    else ngoai++;
  }

  const hcH = Math.round(hc / 6) / 10;
  const ngoaiH = Math.round(ngoai / 6) / 10;
  const demH = Math.round(dem / 6) / 10;

  return {
    hc: hcH,
    ngoaiNgay: ngoaiH,
    dem: demH,
    tongGoc: Math.round((hcH + ngoaiH + demH) * 10) / 10,
    tongHeSo: Math.round((hcH * 1.0 + ngoaiH * 1.5 + demH * 1.7) * 10) / 10
  };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// ============ LƯU Ô ============
function confirmCell() {
  if (!STATE.currentCell) return;

  const { userID, ngay, cellEl } = STATE.currentCell;
  const ky = document.getElementById('fKyHieu').value;
  const tu = document.getElementById('fTuGio').value;
  const den = document.getElementById('fDenGio').value;
  const ct = document.getElementById('fCongTrinh').value.trim();
  const moTa = document.getElementById('fMoTa').value.trim();

  // Cập nhật state tạm (chưa gửi server)
  if (!STATE.chamCong[userID]) STATE.chamCong[userID] = {};
  if (!STATE.chamCong[userID][ngay]) STATE.chamCong[userID][ngay] = {};

  const needTime = ['SCL', 'ĐTXD', 'SXKD', 'SCTX', 'ct', 'CT1', 'CT2'].includes(ky);
const calc = needTime
  ? tinhChamCongJS(tu, den, ngay)
  : { gioGoc: 0, gioHeSo: 0 };


  STATE.chamCong[userID][ngay] = {
  kyHieu: ky,
  gioBatDau: needTime ? tu : '',
  gioKetThuc: needTime ? den : '',
  congTrinh: ct,
  soGio: calc.gioGoc,
  gioGoc: calc.gioGoc,
  gioHeSo: calc.gioHeSo,
  moTa
};

  // Cập nhật DOM
  cellEl.textContent = ky;
  cellEl.className = 'day-cell editable ky-' + getNhom(ky);

  // Đánh dấu dirty
  STATE.dirtyCells.add(userID + '_' + ngay);
  updateSaveButton();

  closeModal();
  renderTable(); // re-render để cập nhật QRC
}

function deleteCell() {
  if (!STATE.currentCell) return;
  const { userID, ngay } = STATE.currentCell;

  if (STATE.chamCong[userID]) {
    delete STATE.chamCong[userID][ngay];
  }
  STATE.dirtyCells.add(userID + '_' + ngay);
  updateSaveButton();
  closeModal();
  renderTable();
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modalOverlay').classList.remove('show');
  STATE.currentCell = null;
}

// ============ LƯU HÀNG LOẠT ============
async function saveAll() {
  if (STATE.dirtyCells.size === 0) return;
  if (STATE.user.vaiTro !== 'approver') {
    alert('Chỉ A/B mới được lưu');
    return;
  }

  const btn = document.getElementById('btnSave');
  btn.disabled = true;
  btn.textContent = '⏳ Đang lưu...';

  let ok = 0, fail = 0;
  for (const key of STATE.dirtyCells) {
    const [userID, ngay] = key.split('_');
    const c = STATE.chamCong[userID]?.[ngay];
    if (!c) {
      // Xóa ô
      const r = await API.deleteChamCong(STATE.token, 'BC_' + userID + '_' + ngay.replace(/-/g,''));
      if (r.ok) ok++; else fail++;
    } else {
      const r = await API.saveChamCong(STATE.token, {
        targetUserID: userID,
        ngay,
        loai: c.kyHieu,
        gioVao: c.gioBatDau || '',
        gioRa: c.gioKetThuc || '',
        congTrinh: c.congTrinh || '',
        soGio: c.soGio || 0,
        moTa: c.moTa || ''
      });
      if (r.ok) ok++; else fail++;
    }
  }

  STATE.dirtyCells.clear();
  updateSaveButton();
  btn.textContent = '💾 Lưu thay đổi';

  setStatus(`✅ Đã lưu ${ok} ô${fail > 0 ? ' (' + fail + ' lỗi)' : ''}`, fail > 0 ? 'err' : 'ok');
}

function updateSaveButton() {
  const btn = document.getElementById('btnSave');
  const hasDirty = STATE.dirtyCells.size > 0;
  const isApprover = STATE.user && STATE.user.vaiTro === 'approver';
  btn.disabled = !hasDirty || !isApprover;
  btn.textContent = hasDirty ? `💾 Lưu (${STATE.dirtyCells.size})` : '💾 Lưu thay đổi';
}

function setStatus(msg, cls) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = 'status-msg ' + (cls || '');
  setTimeout(() => { el.textContent = ''; el.className = 'status-msg'; }, 4000);
}

// ============ LEGEND ============
function renderLegend() {
  const body = document.getElementById('legendBody');
  const groups = {
    plus: '🔵 Làm việc / SXKD',
    ca:   '🟢 Ca làm việc',
    ct:   '🟡 Công tác',
    scl:  '🟠 Sửa chữa lớn (SCL)',
    dtxd: '🔴 Đầu tư xây dựng (ĐTXD)',
    hoc:  '🟣 Học tập',
    le:   '🔴 Lễ, Tết',
    nghi: '⚪ Nghỉ có lương',
    khac: '⚫ Khác'
  };

  let html = '<div class="legend-grid">';
  for (const [nhom, ten] of Object.entries(groups)) {
    html += `<div class="legend-section">${ten}</div>`;
    KY_HIEU.filter(k => k.nhom === nhom).forEach(k => {
      html += `
        <div class="legend-item">
          <span class="ky ky-${k.nhom}">${k.ma}</span>
          <span class="ten">${k.ten}</span>
        </div>
      `;
    });
  }
  html += '</div>';
  body.innerHTML = html;
}

function showLegend() {
  document.getElementById('legendOverlay').classList.add('show');
}
function closeLegend(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('legendOverlay').classList.remove('show');
}

// ============ DROPDOWN KÝ HIỆU ============
function renderKyHieuDropdown() {
  const sel = document.getElementById('fKyHieu');
  sel.innerHTML = KY_HIEU.map(k =>
    `<option value="${k.ma}">${k.ma} — ${k.ten}</option>`
  ).join('');
}

// ============ XUẤT EXCEL ============
function exportExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Chưa tải được thư viện Excel. Vui lòng F5 trang và thử lại.');
    return;
  }

  const thang = STATE.thang; // "2026-09"
  const [yyyy, mm] = thang.split('-').map(Number);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();

  // ===== SẮP XẾP USER THEO UserID =====
  const sortedUsers = [...STATE.users].sort((a, b) =>
    a.userID.localeCompare(b.userID)
  );

  // ===== TÍNH TRƯỚC QRC CHO TẤT CẢ USER =====
  const qrcData = {};
  const qrcTotals = new Array(24).fill(0);
  sortedUsers.forEach(u => {
    const qrc = calcQRC(u.userID, daysInMonth, yyyy, mm);
    qrcData[u.userID] = qrc;
    for (let i = 0; i < 24; i++) {
      if (typeof qrc[i] === 'number') qrcTotals[i] += qrc[i];
    }
  });

  // ===== XÁC ĐỊNH CỘT QRC NÀO CẦN GIỮ =====
  // Bỏ cột nếu tổng tất cả user trong cả tháng = 0
  // Luôn giữ cột 0 (Tổng công) và cột cuối (Ghi chú)
  const qrcNames = [
    'Tổng công', 'SXKD', 'Lễ phép', 'Chờ việc', 'Học tập', 'Công tác',
    'Nghỉ bù', 'Nghỉ ốm', 'KL', 'Nghỉ bù 2', 'ĐD PHCN', 'SCL',
    'AT', 'CĐ', 'TĐ', 'TNLĐ', 'Nghỉ mát', 'Thai sản',
    'Con ốm', 'Riêng', 'NKL', 'Ko lý do', 'Nghỉ việc', 'Ghi chú'
  ];

  const qrcColsToKeep = [];
  for (let i = 0; i < 24; i++) {
    if (i === 0 || i === 23) { qrcColsToKeep.push(i); continue; } // Luôn giữ
    if (qrcTotals[i] > 0) qrcColsToKeep.push(i);
  }

  // ===== SHEET 1: ChamCong =====
  const ws1 = [];

  // Row 1-4: Tiêu đề
  ws1.push(['CÔNG TY TRUYỀN TẢI ĐIỆN 3']);
  ws1.push(['ĐỘI SỬA CHỮA THÍ NGHIỆM ĐIỆN 3']);
  ws1.push(['TỔ THÍ NGHIỆM ĐIỆN LÂM ĐỒNG']);
  ws1.push(['BẢNG CHẤM CÔNG - Tháng ' + mm + ' năm ' + yyyy]);
  ws1.push([]); // dòng trống

  // Row 6: Header chính
  const header1 = ['TT', 'Họ và tên', 'Mã NV', 'Chức danh'];
  for (let d = 1; d <= daysInMonth; d++) header1.push(d);
  qrcColsToKeep.forEach(i => header1.push(qrcNames[i]));
  ws1.push(header1);

  // Row 7: Thứ
  const header2 = ['', '', '', ''];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(yyyy, mm-1, d);
    const thu = date.getDay();
    const thuVN = ['CN','T2','T3','T4','T5','T6','T7'][thu];
    header2.push(thuVN);
  }
  qrcColsToKeep.forEach(() => header2.push(''));
  ws1.push(header2);

  // Data rows
  sortedUsers.forEach((u, idx) => {
    const row = [idx + 1, u.hoTen, u.userID, u.username];

    // 31 ô ngày — ô rỗng ghi '' (KHÔNG ghi 0)
    for (let d = 1; d <= daysInMonth; d++) {
      const ngayStr = yyyy + '-' + String(mm).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      const c = getCellData(u.userID, ngayStr);
      row.push(c && c.kyHieu ? c.kyHieu : '');
    }

    // QRC — chỉ push cột được giữ, ô = 0 thì để ''
    const qrc = qrcData[u.userID];
    qrcColsToKeep.forEach(i => {
      const val = qrc[i];
      row.push(val && val > 0 ? val : '');
    });

    ws1.push(row);
  });

  // Footer: TỔNG CỘNG
  const footer = ['', 'TỔNG CỘNG', '', ''];
  for (let d = 1; d <= daysInMonth; d++) {
    let count = 0;
    sortedUsers.forEach(u => {
      const ngayStr = yyyy + '-' + String(mm).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      const c = getCellData(u.userID, ngayStr);
      if (c && c.kyHieu && !isNghi(c.kyHieu)) count++;
    });
    footer.push(count > 0 ? count : '');
  }
  qrcColsToKeep.forEach(i => {
    const val = qrcTotals[i];
    footer.push(val && val > 0 ? val : '');
  });
  ws1.push(footer);

  // ===== SHEET 2: TongHop =====
  const ws2 = [];
  ws2.push(['TỔNG HỢP CHẤM CÔNG - Tháng ' + mm + '/' + yyyy]);
  ws2.push([]);

  // Header — chỉ cột được giữ
  const headerTH = ['TT', 'Họ và tên', 'Mã NV', 'Chức danh'];
  qrcColsToKeep.forEach(i => {
    if (i !== 23) headerTH.push(qrcNames[i]); // bỏ cột "Ghi chú" cuối
  });
  ws2.push(headerTH);

  sortedUsers.forEach((u, idx) => {
    const qrc = qrcData[u.userID];
    const row = [idx + 1, u.hoTen, u.userID, u.username];
    qrcColsToKeep.forEach(i => {
      if (i !== 23) {
        const val = qrc[i];
        row.push(val && val > 0 ? val : '');
      }
    });
    ws2.push(row);
  });

  // ===== TẠO WORKBOOK =====
  const wb = XLSX.utils.book_new();
  const sh1 = XLSX.utils.aoa_to_sheet(ws1);
  const sh2 = XLSX.utils.aoa_to_sheet(ws2);

  // Column widths
  sh1['!cols'] = [
    { wch: 5 }, { wch: 22 }, { wch: 8 }, { wch: 12 },
    ...Array(daysInMonth).fill({ wch: 5 }),
    ...Array(qrcColsToKeep.length).fill({ wch: 8 })
  ];

  XLSX.utils.book_append_sheet(wb, sh1, 'ChamCong');
  XLSX.utils.book_append_sheet(wb, sh2, 'TongHop');

  // Xuất file
  const fileName = 'BangChamCong_Thang' + mm + '_' + yyyy + '.xlsx';
  XLSX.writeFile(wb, fileName);

  setStatus('✅ Đã xuất file: ' + fileName, 'ok');
}

// ============ UTILS ============
function formatDate(yyyymmdd) {
  const [y, m, d] = yyyymmdd.split('-');
  return `${d}/${m}/${y}`;
}

function goHome() {
  location.href = 'home.html';
}

async function doLogout() {
  if (!confirm('Đăng xuất?')) return;
  await API.logout(STATE.token);
  sessionStorage.clear();
  location.href = 'index.html';
}
/**
 * Chuẩn hóa ngày về "YYYY-MM-DD"
 */
function normalizeNgay(v) {
  if (!v) return '';
  // Trường hợp Date object
  if (v instanceof Date) {
    return v.getFullYear() + '-' +
      String(v.getMonth()+1).padStart(2,'0') + '-' +
      String(v.getDate()).padStart(2,'0');
  }
  const s = String(v);
  // ISO string: "2026-09-15T00:00:00.000Z" → "2026-09-15"
  if (s.includes('T')) return s.slice(0, 10);
  // Đã đúng format
  return s;
}

// ============ BOOT ============
init();
