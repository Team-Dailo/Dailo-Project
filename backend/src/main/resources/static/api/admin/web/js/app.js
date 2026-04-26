// ===== Init =====
(function init() {
  if (getToken() && getRole() === 'ADMIN') {
    showApp();
  } else {
    document.getElementById('loginView').classList.remove('hidden');
  }
})();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('loginErr');
  err.style.display = 'none';
  try {
    const email = document.getElementById('loginEmail').value;
    const pw = document.getElementById('loginPw').value;
    const r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw }),
    });
    if (!r.ok) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    const t = await r.json();
    const token = t.accessToken || t.access_token;
    if (!token) throw new Error('토큰 없음');
    const me = await fetch('/api/members/me', { headers: { Authorization: 'Bearer ' + token } });
    if (!me.ok) throw new Error('사용자 정보 조회 실패');
    const u = await me.json();
    if (u.role !== 'ADMIN') throw new Error('관리자 권한이 없습니다.');
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_role', u.role);
    localStorage.setItem('admin_email', u.email);
    localStorage.setItem('admin_id', u.id);
    showApp();
  } catch (ex) {
    err.textContent = ex.message; err.style.display = 'block';
  }
});

function showApp() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  loadDashboard();
}

// ===== Navigation =====
document.querySelectorAll('.sidebar a[data-page]').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const pg = a.dataset.page;
    document.querySelectorAll('.sidebar a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('pg-' + pg).classList.add('active');
    loaders[pg]?.();
  });
});

const loaders = {
  dashboard: loadDashboard,
  members: () => loadMembers(0),
  events: () => loadEvents(0),
  posts: () => loadPosts(0),
  comments: () => loadComments(0),
  notices: loadNotices,
  faq: loadFaq,
  banners: loadBanners,
  reports: loadReports,
  blocks: loadBlocks,
  inquiries: () => loadInquiries(0),
  push: () => {},
  appversions: loadVersions,
  logs: () => loadLogs(0),
};

// ===== Helpers =====
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtDate(s) { return s ? new Date(s).toLocaleDateString('ko') : '-'; }
function fmtDateTime(s) { return s ? new Date(s).toLocaleString('ko') : '-'; }
function badge(text, cls) { return `<span class="badge ${cls}">${esc(text)}</span>`; }
function roleBadge(r) { return badge(r || 'USER', r === 'ADMIN' ? 'b-admin' : 'b-user'); }
function statusBadge(s) { return badge(s || '-', s === 'ACTIVE' ? 'b-active' : s === 'DELETED' ? 'b-del' : 'b-pending'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function openModal(id) { document.getElementById(id).classList.add('show'); }

function pagingHtml(id, page, totalPages, fn) {
  let h = '';
  const start = Math.max(0, page - 4);
  const end = Math.min(totalPages, start + 10);
  for (let i = start; i < end; i++) {
    h += `<button class="${i === page ? 'cur' : ''}" onclick="${fn}(${i})">${i + 1}</button>`;
  }
  document.getElementById(id).innerHTML = h;
}

// ===== Dashboard =====
async function loadDashboard() {
  try {
    const d = await apiJson('/api/admin/dashboard');
    const ms = d.memberStats || d;
    const es = d.eventStats || d;
    const ps = d.postStats || d;
    const rs = d.reportStats || d;
    const is = d.inquiryStats || d;
    document.getElementById('dashStats').innerHTML = `
      <div class="stat"><div class="l">전체 회원</div><div class="v">${ms.totalMembers ?? '-'}</div></div>
      <div class="stat"><div class="l">오늘 가입</div><div class="v">${ms.todaySignups ?? '-'}</div></div>
      <div class="stat"><div class="l">전체 행사</div><div class="v">${es.totalEvents ?? '-'}</div></div>
      <div class="stat"><div class="l">전체 게시글</div><div class="v">${ps.totalPosts ?? '-'}</div></div>
      <div class="stat"><div class="l">미처리 신고</div><div class="v">${rs.pendingReports ?? '-'}</div></div>
      <div class="stat"><div class="l">미처리 문의</div><div class="v">${is.pendingInquiries ?? '-'}</div></div>
    `;
  } catch (e) {
    document.getElementById('dashStats').innerHTML = `<div class="stat"><div class="l">로드 실패: ${esc(e.message)}</div></div>`;
  }
}

// ===== Members =====
let _suspendId = null;
async function loadMembers(page) {
  try {
    const d = await apiJson(`/api/admin/members?page=${page}&size=20`);
    const rows = (d.content || []).map(m => `<tr>
      <td>${m.id}</td><td>${esc(m.email)}</td><td>${esc(m.nickname)}</td>
      <td>${roleBadge(m.role)}</td><td>${statusBadge(m.status)}</td><td>${fmtDate(m.createdAt)}</td>
      <td><button class="btn btn-d btn-sm" onclick="openSuspend(${m.id},'${esc(m.email)}')">정지</button></td>
    </tr>`).join('');
    document.getElementById('tMembers').innerHTML = rows || '<tr><td colspan="7" class="loading">없음</td></tr>';
    pagingHtml('pgMembers', d.number || 0, d.totalPages || 1, 'loadMembers');
  } catch (e) { document.getElementById('tMembers').innerHTML = '<tr><td colspan="7" class="loading">로드 실패</td></tr>'; }
}
function openSuspend(id, email) { _suspendId = id; document.getElementById('suspendInfo').textContent = `${email} (ID: ${id})`; openModal('suspendModal'); }
async function confirmSuspend() {
  if (!_suspendId) return;
  try {
    await api(`/api/admin/members/${_suspendId}/suspend`, { method: 'PATCH', body: JSON.stringify({ type: document.getElementById('suspendType').value }) });
    closeModal('suspendModal'); loadMembers(0);
  } catch (e) { alert('실패: ' + e.message); }
}

// ===== Events =====
async function loadEvents(page) {
  try {
    const d = await apiJson(`/api/admin/events?page=${page}&size=20`);
    const rows = (d.content || []).map(e => `<tr>
      <td>${e.id}</td><td>${esc(e.title)}</td><td>${esc(e.placeName)}</td>
      <td>${fmtDate(e.startAt)}</td><td>${fmtDate(e.endAt)}</td>
      <td>${statusBadge(e.status)}</td>
      <td class="flex-gap">
        <button class="btn btn-g btn-sm" onclick="editEvent(${e.id})">수정</button>
        <button class="btn btn-d btn-sm" onclick="deleteEvent(${e.id})">삭제</button>
      </td>
    </tr>`).join('');
    document.getElementById('tEvents').innerHTML = rows || '<tr><td colspan="7" class="loading">없음</td></tr>';
    pagingHtml('pgEvents', d.number || 0, d.totalPages || 1, 'loadEvents');
  } catch (e) { document.getElementById('tEvents').innerHTML = `<tr><td colspan="7" class="loading">로드 실패: ${esc(e.message)}</td></tr>`; }
}
function fmtDtLocal(s) { return s ? s.substring(0, 16) : ''; }
function openEventModal(id, data) {
  document.getElementById('eventEditId').value = id || '';
  document.getElementById('eventTitle').value = data?.title || '';
  document.getElementById('eventPlaceName').value = data?.placeName || '';
  document.getElementById('eventRegion').value = data?.regionName || '';
  document.getElementById('eventAddress').value = data?.placeAddress || '';
  document.getElementById('eventLat').value = data?.latitude || '';
  document.getElementById('eventLng').value = data?.longitude || '';
  document.getElementById('eventStart').value = fmtDtLocal(data?.startAt) || '';
  document.getElementById('eventEnd').value = fmtDtLocal(data?.endAt) || '';
  document.getElementById('eventStatus').value = data?.status || 'DRAFT';
  document.getElementById('eventFilter').value = data?.filterGroup || '';
  document.getElementById('eventDesc').value = data?.description || '';
  document.getElementById('eventContact').value = data?.hostContact || '';
  document.getElementById('eventThumbKey').value = data?.thumbnailUrl || '';
  const preview = document.getElementById('eventThumbPreview');
  const placeholder = document.getElementById('eventDropPlaceholder');
  if (data?.thumbnailUrl) {
    preview.src = data.thumbnailUrl;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    preview.src = '';
    preview.style.display = 'none';
    placeholder.style.display = '';
  }
  document.querySelectorAll('#eventCategories input[type=checkbox]').forEach(cb => {
    cb.checked = (data?.categories || []).includes(cb.value);
  });
  document.getElementById('eventModalTitle').textContent = id ? '행사 수정' : '행사 추가';
  openModal('eventModal');
  initEventMap(data?.latitude || 36.97, data?.longitude || 127.93);
}
async function editEvent(id) {
  try { const d = await apiJson(`/api/admin/events/${id}`); openEventModal(d.id, d); } catch (e) { alert(e.message); }
}
async function saveEvent() {
  const id = document.getElementById('eventEditId').value;
  const cats = []; document.querySelectorAll('#eventCategories input:checked').forEach(cb => cats.push(cb.value));
  if (cats.length === 0) { alert('카테고리를 1개 이상 선택하세요.'); return; }
  const body = {
    title: document.getElementById('eventTitle').value,
    placeName: document.getElementById('eventPlaceName').value || null,
    placeAddress: document.getElementById('eventAddress').value || null,
    regionName: document.getElementById('eventRegion').value || null,
    latitude: Number(document.getElementById('eventLat').value),
    longitude: Number(document.getElementById('eventLng').value),
    startAt: document.getElementById('eventStart').value + ':00',
    endAt: document.getElementById('eventEnd').value + ':00',
    status: document.getElementById('eventStatus').value,
    filterGroup: document.getElementById('eventFilter').value || null,
    categories: cats,
    thumbnailUrl: document.getElementById('eventThumbKey').value || null,
    description: document.getElementById('eventDesc').value || null,
    hostContact: document.getElementById('eventContact').value || null,
  };
  try {
    if (id) await api(`/api/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/events', { method: 'POST', body: JSON.stringify(body) });
    closeModal('eventModal'); loadEvents(0);
  } catch (e) { alert('저장 실패: ' + e.message); }
}
async function deleteEvent(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try { await api(`/api/admin/events/${id}`, { method: 'DELETE' }); loadEvents(0); } catch (e) { alert(e.message); }
}

// ===== Posts =====
async function loadPosts(page) {
  try {
    const d = await apiJson('/api/admin/reports/record/by-post');
    const rows = (d || []).map(p => `<tr>
      <td>${p.postId}</td><td>${esc(p.title)}</td><td>${esc(p.authorNickname)} (${p.authorId})</td>
      <td>${p.reportCount}</td><td>-</td>
      <td><button class="btn btn-d btn-sm" onclick="deletePost(${p.postId})">삭제</button></td>
    </tr>`).join('');
    document.getElementById('tPosts').innerHTML = rows || '<tr><td colspan="6" class="loading">없음</td></tr>';
  } catch (e) { document.getElementById('tPosts').innerHTML = '<tr><td colspan="6" class="loading">로드 실패</td></tr>'; }
}
async function deletePost(id) {
  if (!confirm('게시글을 삭제하시겠습니까?')) return;
  try { await api(`/api/admin/posts/${id}`, { method: 'DELETE' }); loadPosts(0); } catch (e) { alert(e.message); }
}

// ===== Comments =====
async function loadComments(page) {
  try {
    const d = await apiJson(`/api/admin/comments?page=${page}&size=20`);
    const rows = (d.content || []).map(c => `<tr>
      <td>${c.id}</td><td>${esc(c.postTitle)} (${c.postId})</td><td>${esc(c.authorNickname)}</td>
      <td>${esc(c.content?.substring(0, 40))}</td>
      <td>${badge(c.status, c.status === 'VISIBLE' ? 'b-visible' : c.status === 'HIDDEN' ? 'b-hidden' : 'b-del')}</td>
      <td>${c.reportCount || 0}</td>
      <td class="flex-gap">
        <button class="btn btn-w btn-sm" onclick="hideComment(${c.id})">숨김</button>
        <button class="btn btn-s btn-sm" onclick="restoreComment(${c.id})">복원</button>
        <button class="btn btn-d btn-sm" onclick="delComment(${c.id})">삭제</button>
      </td>
    </tr>`).join('');
    document.getElementById('tComments').innerHTML = rows || '<tr><td colspan="7" class="loading">없음</td></tr>';
    pagingHtml('pgComments', d.number || 0, d.totalPages || 1, 'loadComments');
  } catch (e) { document.getElementById('tComments').innerHTML = '<tr><td colspan="7" class="loading">로드 실패</td></tr>'; }
}
async function hideComment(id) { try { await api(`/api/admin/comments/${id}/hide`, { method: 'PATCH' }); loadComments(0); } catch (e) { alert(e.message); } }
async function restoreComment(id) { try { await api(`/api/admin/comments/${id}/restore`, { method: 'PATCH' }); loadComments(0); } catch (e) { alert(e.message); } }
async function delComment(id) { if (!confirm('삭제?')) return; try { await api(`/api/admin/comments/${id}`, { method: 'DELETE' }); loadComments(0); } catch (e) { alert(e.message); } }

// ===== Notices =====
async function loadNotices() {
  try {
    const d = await apiJson('/api/notices?page=0&size=100');
    const list = d.content || d || [];
    const rows = list.map(n => `<tr>
      <td>${n.id}</td><td>${esc(n.title)}</td><td>${fmtDate(n.createdAt)}</td>
      <td class="flex-gap">
        <button class="btn btn-g btn-sm" onclick="editNotice(${n.id})">수정</button>
        <button class="btn btn-d btn-sm" onclick="delNotice(${n.id})">삭제</button>
      </td>
    </tr>`).join('');
    document.getElementById('tNotices').innerHTML = rows || '<tr><td colspan="4" class="loading">없음</td></tr>';
  } catch (e) { document.getElementById('tNotices').innerHTML = `<tr><td colspan="4" class="loading">로드 실패: ${esc(e.message)}</td></tr>`; }
}
function openNoticeModal(id, title, content) {
  document.getElementById('noticeEditId').value = id || '';
  document.getElementById('noticeTitle').value = title || '';
  document.getElementById('noticeContent').value = content || '';
  document.getElementById('noticeModalTitle').textContent = id ? '공지사항 수정' : '공지사항 작성';
  openModal('noticeModal');
}
async function editNotice(id) {
  try {
    const n = await apiJson(`/api/notices/${id}`);
    if (n) openNoticeModal(n.id, n.title, n.content);
  } catch (e) { alert(e.message); }
}
async function saveNotice() {
  const id = document.getElementById('noticeEditId').value;
  const body = { title: document.getElementById('noticeTitle').value, content: document.getElementById('noticeContent').value };
  try {
    if (id) await api(`/api/admin/notices/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/notices', { method: 'POST', body: JSON.stringify(body) });
    closeModal('noticeModal'); loadNotices();
  } catch (e) { alert(e.message); }
}
async function delNotice(id) { if (!confirm('삭제?')) return; try { await api(`/api/admin/notices/${id}`, { method: 'DELETE' }); loadNotices(); } catch (e) { alert(e.message); } }

// ===== FAQ =====
async function loadFaq() {
  try {
    const d = await apiJson('/api/admin/faq?page=0&size=100');
    const list = d.content || d || [];
    const rows = list.map(f => `<tr>
      <td>${f.id}</td><td>${esc(f.category)}</td><td>${esc(f.question)}</td>
      <td>${f.isActive ? badge('ON', 'b-active') : badge('OFF', 'b-del')}</td><td>${f.displayOrder}</td>
      <td class="flex-gap">
        <button class="btn btn-g btn-sm" onclick="editFaq(${f.id})">수정</button>
        <button class="btn btn-w btn-sm" onclick="toggleFaq(${f.id})">토글</button>
        <button class="btn btn-d btn-sm" onclick="delFaq(${f.id})">삭제</button>
      </td>
    </tr>`).join('');
    document.getElementById('tFaq').innerHTML = rows || '<tr><td colspan="6" class="loading">없음</td></tr>';
  } catch (e) { document.getElementById('tFaq').innerHTML = '<tr><td colspan="6" class="loading">로드 실패</td></tr>'; }
}
function openFaqModal(id, cat, q, a, order) {
  document.getElementById('faqEditId').value = id || '';
  document.getElementById('faqCategory').value = cat || '';
  document.getElementById('faqQuestion').value = q || '';
  document.getElementById('faqAnswer').value = a || '';
  document.getElementById('faqOrder').value = order || 0;
  document.getElementById('faqModalTitle').textContent = id ? 'FAQ 수정' : 'FAQ 추가';
  openModal('faqModal');
}
async function editFaq(id) {
  try { const f = await apiJson(`/api/admin/faq/${id}`); openFaqModal(f.id, f.category, f.question, f.answer, f.displayOrder); } catch (e) { alert(e.message); }
}
async function saveFaq() {
  const id = document.getElementById('faqEditId').value;
  const body = { category: document.getElementById('faqCategory').value, question: document.getElementById('faqQuestion').value, answer: document.getElementById('faqAnswer').value, displayOrder: Number(document.getElementById('faqOrder').value) };
  try {
    if (id) await api(`/api/admin/faq/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/faq', { method: 'POST', body: JSON.stringify(body) });
    closeModal('faqModal'); loadFaq();
  } catch (e) { alert(e.message); }
}
async function toggleFaq(id) { try { await api(`/api/admin/faq/${id}/toggle`, { method: 'PATCH' }); loadFaq(); } catch (e) { alert(e.message); } }
async function delFaq(id) { if (!confirm('삭제?')) return; try { await api(`/api/admin/faq/${id}`, { method: 'DELETE' }); loadFaq(); } catch (e) { alert(e.message); } }

// ===== Banners =====
async function loadBanners() {
  try {
    const d = await apiJson('/api/admin/banners?page=0&size=100');
    const list = d.content || d || [];
    const rows = list.map(b => `<tr>
      <td>${b.id}</td><td>${esc(b.title)}</td>
      <td>${b.isActive ? badge('ON', 'b-active') : badge('OFF', 'b-del')}</td><td>${b.displayOrder}</td>
      <td>${fmtDate(b.startAt)} ~ ${fmtDate(b.endAt)}</td>
      <td class="flex-gap">
        <button class="btn btn-g btn-sm" onclick="editBanner(${b.id})">수정</button>
        <button class="btn btn-w btn-sm" onclick="toggleBanner(${b.id})">토글</button>
        <button class="btn btn-d btn-sm" onclick="delBanner(${b.id})">삭제</button>
      </td>
    </tr>`).join('');
    document.getElementById('tBanners').innerHTML = rows || '<tr><td colspan="6" class="loading">없음</td></tr>';
  } catch (e) { document.getElementById('tBanners').innerHTML = '<tr><td colspan="6" class="loading">로드 실패</td></tr>'; }
}
function openBannerModal(id, title, imgUrl, linkUrl, linkType, order) {
  document.getElementById('bannerEditId').value = id || '';
  document.getElementById('bannerTitle').value = title || '';
  document.getElementById('bannerImageUrl').value = imgUrl || '';
  document.getElementById('bannerLinkUrl').value = linkUrl || '';
  document.getElementById('bannerLinkType').value = linkType || 'NONE';
  document.getElementById('bannerOrder').value = order || 0;
  document.getElementById('bannerModalTitle').textContent = id ? '배너 수정' : '배너 추가';
  openModal('bannerModal');
}
async function editBanner(id) {
  try { const b = await apiJson(`/api/admin/banners/${id}`); openBannerModal(b.id, b.title, b.imageUrl, b.linkUrl, b.linkType, b.displayOrder); } catch (e) { alert(e.message); }
}
async function saveBanner() {
  const id = document.getElementById('bannerEditId').value;
  const body = { title: document.getElementById('bannerTitle').value, imageUrl: document.getElementById('bannerImageUrl').value, linkUrl: document.getElementById('bannerLinkUrl').value || null, linkType: document.getElementById('bannerLinkType').value, displayOrder: Number(document.getElementById('bannerOrder').value) };
  try {
    if (id) await api(`/api/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/banners', { method: 'POST', body: JSON.stringify(body) });
    closeModal('bannerModal'); loadBanners();
  } catch (e) { alert(e.message); }
}
async function toggleBanner(id) { try { await api(`/api/admin/banners/${id}/toggle`, { method: 'PATCH' }); loadBanners(); } catch (e) { alert(e.message); } }
async function delBanner(id) { if (!confirm('삭제?')) return; try { await api(`/api/admin/banners/${id}`, { method: 'DELETE' }); loadBanners(); } catch (e) { alert(e.message); } }

// ===== Reports =====
async function loadReports() {
  try {
    const d = await apiJson('/api/admin/reports/record/by-post');
    const rows = (d || []).map(r => `<tr>
      <td>${r.postId}</td><td>${esc(r.title)}</td><td>${esc(r.authorNickname)} (${r.authorId})</td><td>${r.reportCount}</td>
    </tr>`).join('');
    document.getElementById('tReports').innerHTML = rows || '<tr><td colspan="4" class="loading">없음</td></tr>';
  } catch (e) { document.getElementById('tReports').innerHTML = '<tr><td colspan="4" class="loading">로드 실패</td></tr>'; }
}

// ===== Blocks =====
async function loadBlocks() {
  try {
    const d = await apiJson('/api/admin/blocks/heavy-blocked');
    const rows = (d || []).map(b => `<tr>
      <td>${b.memberId}</td><td>${esc(b.email)}</td><td>${esc(b.nickname)}</td><td>${b.blockCount}</td>
      <td>${fmtDateTime(b.suspendedUntil)}</td>
      <td><button class="btn btn-d btn-sm" onclick="openSuspend(${b.memberId},'${esc(b.email)}')">정지</button></td>
    </tr>`).join('');
    document.getElementById('tBlocks').innerHTML = rows || '<tr><td colspan="6" class="loading">없음</td></tr>';
  } catch (e) { document.getElementById('tBlocks').innerHTML = '<tr><td colspan="6" class="loading">로드 실패</td></tr>'; }
}

// ===== Inquiries =====
let _inquiryId = null;
async function loadInquiries(page) {
  try {
    const d = await apiJson(`/api/admin/inquiries?page=${page}&size=20`);
    const rows = (d.content || []).map(i => `<tr>
      <td>${i.id}</td><td>${esc(i.email)}</td><td>${esc(i.title)}</td>
      <td>${badge(i.status, i.status === 'PENDING' ? 'b-pending' : i.status === 'ANSWERED' ? 'b-answered' : 'b-closed')}</td>
      <td>${fmtDate(i.createdAt)}</td>
      <td><button class="btn btn-g btn-sm" onclick="openInquiry(${i.id})">상세</button></td>
    </tr>`).join('');
    document.getElementById('tInquiries').innerHTML = rows || '<tr><td colspan="6" class="loading">없음</td></tr>';
    pagingHtml('pgInquiries', d.number || 0, d.totalPages || 1, 'loadInquiries');
  } catch (e) { document.getElementById('tInquiries').innerHTML = '<tr><td colspan="6" class="loading">로드 실패</td></tr>'; }
}
async function openInquiry(id) {
  _inquiryId = id;
  try {
    const d = await apiJson(`/api/admin/inquiries/${id}`);
    document.getElementById('inquiryDetail').innerHTML = `
      <p><b>이메일:</b> ${esc(d.email)}</p>
      <p><b>제목:</b> ${esc(d.title)}</p>
      <p><b>내용:</b> ${esc(d.content)}</p>
      <p><b>상태:</b> ${d.status}</p>
      <p><b>기존 답변:</b> ${esc(d.answer) || '없음'}</p>
    `;
    document.getElementById('inquiryAnswer').value = d.answer || '';
    openModal('inquiryModal');
  } catch (e) { alert(e.message); }
}
async function saveInquiryAnswer() {
  if (!_inquiryId) return;
  try {
    await api(`/api/admin/inquiries/${_inquiryId}/answer`, { method: 'PUT', body: JSON.stringify({ answer: document.getElementById('inquiryAnswer').value }) });
    closeModal('inquiryModal'); loadInquiries(0);
  } catch (e) { alert(e.message); }
}

// ===== Push =====
async function sendPush() {
  const title = document.getElementById('pushTitle').value;
  const body = document.getElementById('pushBody').value;
  if (!title || !body) { alert('제목과 내용을 입력하세요.'); return; }
  if (!confirm('전체 사용자에게 푸시를 발송하시겠습니까?')) return;
  try {
    const r = await apiJson('/api/admin/notifications/send-all', { method: 'POST', body: JSON.stringify({ title, body }) });
    document.getElementById('pushResult').textContent = `발송 완료 - 성공: ${r.sentCount}, 실패: ${r.failedCount}`;
  } catch (e) { document.getElementById('pushResult').textContent = '발송 실패: ' + e.message; }
}

// ===== App Versions =====
async function loadVersions() {
  try {
    const d = await apiJson('/api/admin/app-versions');
    const list = Array.isArray(d) ? d : (d.content || []);
    const rows = list.map(v => `<tr>
      <td>${v.id || '-'}</td><td>${v.platform}</td><td>${v.minimumVersion}</td><td>${v.latestVersion}</td>
      <td>${v.forceUpdate ? badge('YES', 'b-del') : badge('NO', 'b-active')}</td>
      <td class="flex-gap">
        <button class="btn btn-g btn-sm" onclick="editVersion('${v.platform}')">수정</button>
      </td>
    </tr>`).join('');
    document.getElementById('tVersions').innerHTML = rows || '<tr><td colspan="6" class="loading">없음</td></tr>';
  } catch (e) { document.getElementById('tVersions').innerHTML = '<tr><td colspan="6" class="loading">로드 실패</td></tr>'; }
}
function openVersionModal(id, platform, min, latest, force, storeUrl) {
  document.getElementById('versionEditId').value = id || '';
  document.getElementById('versionPlatform').value = platform || 'IOS';
  document.getElementById('versionMin').value = min || '';
  document.getElementById('versionLatest').value = latest || '';
  document.getElementById('versionForce').checked = !!force;
  document.getElementById('versionStoreUrl').value = storeUrl || '';
  document.getElementById('versionModalTitle').textContent = id ? '앱 버전 수정' : '앱 버전 추가';
  openModal('versionModal');
}
async function editVersion(platform) {
  try { const v = await apiJson(`/api/admin/app-versions/${platform}`); openVersionModal(v.id, v.platform, v.minimumVersion, v.latestVersion, v.forceUpdate, v.storeUrl); } catch (e) { alert(e.message); }
}
async function saveVersion() {
  const body = { platform: document.getElementById('versionPlatform').value, minimumVersion: document.getElementById('versionMin').value, latestVersion: document.getElementById('versionLatest').value, forceUpdate: document.getElementById('versionForce').checked, storeUrl: document.getElementById('versionStoreUrl').value || null };
  try {
    await api('/api/admin/app-versions', { method: 'PUT', body: JSON.stringify(body) });
    closeModal('versionModal'); loadVersions();
  } catch (e) { alert(e.message); }
}

// ===== Logs =====
async function loadLogs(page) {
  try {
    const d = await apiJson(`/api/admin/logs?page=${page}&size=20`);
    const rows = (d.content || []).map(l => `<tr>
      <td>${l.id}</td><td>${esc(l.adminEmail)}</td><td>${esc(l.action)}</td>
      <td>${esc(l.targetType)}${l.targetId ? ' #' + l.targetId : ''}</td>
      <td>${esc(l.description?.substring(0, 50))}</td><td>${fmtDateTime(l.createdAt)}</td>
    </tr>`).join('');
    document.getElementById('tLogs').innerHTML = rows || '<tr><td colspan="6" class="loading">없음</td></tr>';
    pagingHtml('pgLogs', d.number || 0, d.totalPages || 1, 'loadLogs');
  } catch (e) { document.getElementById('tLogs').innerHTML = '<tr><td colspan="6" class="loading">로드 실패</td></tr>'; }
}

// ===== Location Map Picker =====
let _eventMap = null;
let _eventMarker = null;

function initEventMap(lat, lng) {
  const wrap = document.getElementById('eventMapWrap');
  if (!wrap) return;

  setTimeout(() => {
    if (_eventMap) { _eventMap.remove(); _eventMap = null; }

    _eventMap = L.map(wrap, { zoomControl: true }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(_eventMap);

    _eventMarker = L.marker([lat, lng], { draggable: true }).addTo(_eventMap);
    updateLatLngInputs(lat, lng);

    _eventMarker.on('dragend', () => {
      const p = _eventMarker.getLatLng();
      updateLatLngInputs(p.lat, p.lng);
    });

    _eventMap.on('click', (e) => {
      _eventMarker.setLatLng(e.latlng);
      updateLatLngInputs(e.latlng.lat, e.latlng.lng);
    });

    _eventMap.invalidateSize();
  }, 100);
}

function updateLatLngInputs(lat, lng) {
  document.getElementById('eventLat').value = Math.round(lat * 1e7) / 1e7;
  document.getElementById('eventLng').value = Math.round(lng * 1e7) / 1e7;
}

// ===== Dropzone Upload =====
(function initDropzone() {
  const zone = document.getElementById('eventDropzone');
  const fileInput = document.getElementById('eventThumbFile');
  const preview = document.getElementById('eventThumbPreview');
  const placeholder = document.getElementById('eventDropPlaceholder');
  const keyInput = document.getElementById('eventThumbKey');
  if (!zone) return;

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) uploadThumb(file);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) uploadThumb(fileInput.files[0]);
  });

  async function uploadThumb(file) {
    placeholder.textContent = '업로드 중...';
    placeholder.style.display = '';
    preview.style.display = 'none';
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + getToken(), 'X-User-Id': localStorage.getItem('admin_id') || '' },
        body: fd,
      });
      if (!res.ok) throw new Error('업로드 실패 (' + res.status + ')');
      const data = await res.json();
      keyInput.value = data.key;
      preview.src = data.url;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
    } catch (e) {
      placeholder.textContent = '업로드 실패: ' + e.message;
      preview.style.display = 'none';
    }
  }
})();
