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
  document.getElementById('dashStats').innerHTML = '<div class="stat"><div class="l" style="text-align:center;padding:20px">로딩 중…</div></div>';
  try {
    const [d, activity] = await Promise.all([
      apiJson('/api/admin/dashboard'),
      apiJson('/api/admin/dashboard/daily-activity').catch(() => null),
    ]);
    const ms = d.memberStats;
    const es = d.eventStats;
    const ps = d.postStats;
    const rs = d.reportStats;
    const is = d.inquiryStats;

    // 1. 핵심 지표 카드
    let html = '<div class="stats">';
    html += '<div class="stat"><div class="l">전체 회원</div><div class="v">' + ms.total + '</div>'
          + (ms.todaySignups > 0 ? '<div style="font-size:12px;color:var(--success);margin-top:4px">+' + ms.todaySignups + ' 오늘 가입</div>' : '') + '</div>';
    html += '<div class="stat"><div class="l">활성 회원</div><div class="v" style="color:var(--success)">' + ms.active + '</div>'
          + (ms.suspended > 0 ? '<div style="font-size:12px;color:var(--warn);margin-top:4px">정지 ' + ms.suspended + '명</div>' : '') + '</div>';
    html += '<div class="stat"><div class="l">전체 행사</div><div class="v">' + es.total + '</div>'
          + '<div style="font-size:12px;color:var(--success);margin-top:4px">ACTIVE ' + es.active + '</div></div>';
    html += '<div class="stat"><div class="l">전체 게시글</div><div class="v">' + ps.total + '</div>'
          + (ps.todayPosts > 0 ? '<div style="font-size:12px;color:var(--success);margin-top:4px">+' + ps.todayPosts + ' 오늘</div>' : '') + '</div>';
    html += '<div class="stat"><div class="l">미처리 신고</div>'
          + '<div class="v" style="' + (rs.pending > 0 ? 'color:var(--danger)' : '') + '">' + rs.pending + '</div>'
          + '<div style="font-size:12px;color:var(--muted);margin-top:4px">전체 ' + rs.total + '</div></div>';
    html += '<div class="stat"><div class="l">미처리 문의</div>'
          + '<div class="v" style="' + (is.pending > 0 ? 'color:var(--danger)' : '') + '">' + is.pending + '</div>'
          + '<div style="font-size:12px;color:var(--muted);margin-top:4px">전체 ' + is.total + '</div></div>';
    if (activity) {
      html += '<div class="stat"><div class="l">오늘 조회 클릭</div><div class="v">' + activity.totalClicks + '</div></div>';
    }
    html += '</div>';

    // 2. 상세 현황 (2열)
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">';

    html += '<div class="card"><h3>회원 현황</h3><table>'
          + '<tr><td>활성</td><td style="text-align:right;font-weight:700;color:var(--success)">' + ms.active + '</td></tr>'
          + '<tr><td>정지</td><td style="text-align:right;font-weight:700;color:var(--warn)">' + ms.suspended + '</td></tr>'
          + '<tr><td>탈퇴</td><td style="text-align:right;font-weight:700;color:var(--muted)">' + ms.deleted + '</td></tr>'
          + '<tr><td>오늘 가입</td><td style="text-align:right;font-weight:700">' + ms.todaySignups + '</td></tr>'
          + '</table></div>';

    html += '<div class="card"><h3>행사 현황</h3><table>'
          + '<tr><td>ACTIVE</td><td style="text-align:right;font-weight:700;color:var(--success)">' + es.active + '</td></tr>'
          + '<tr><td>DRAFT</td><td style="text-align:right;font-weight:700;color:var(--warn)">' + es.draft + '</td></tr>'
          + '<tr><td>ENDED</td><td style="text-align:right;font-weight:700;color:var(--muted)">' + es.ended + '</td></tr>'
          + '<tr><td>INACTIVE</td><td style="text-align:right;font-weight:700;color:var(--muted)">' + es.inactive + '</td></tr>'
          + '</table></div>';

    html += '<div class="card"><h3>게시글 현황</h3><table>'
          + '<tr><td>게시 중</td><td style="text-align:right;font-weight:700;color:var(--success)">' + ps.published + '</td></tr>'
          + '<tr><td>숨김</td><td style="text-align:right;font-weight:700;color:var(--warn)">' + ps.hidden + '</td></tr>'
          + '<tr><td>오늘 작성</td><td style="text-align:right;font-weight:700">' + ps.todayPosts + '</td></tr>'
          + '</table></div>';

    html += '<div class="card"><h3>신고 / 문의</h3><table>'
          + '<tr><td>미처리 신고</td><td style="text-align:right;font-weight:700;color:' + (rs.pending > 0 ? 'var(--danger)' : 'inherit') + '">' + rs.pending + '</td></tr>'
          + '<tr><td>처리된 신고</td><td style="text-align:right;font-weight:700;color:var(--muted)">' + rs.resolved + '</td></tr>'
          + '<tr><td>미처리 문의</td><td style="text-align:right;font-weight:700;color:' + (is.pending > 0 ? 'var(--danger)' : 'inherit') + '">' + is.pending + '</td></tr>'
          + '<tr><td>답변 완료</td><td style="text-align:right;font-weight:700;color:var(--muted)">' + is.answered + '</td></tr>'
          + '</table></div>';

    html += '</div>';

    // 3. 시간대별 조회 차트
    if (activity && activity.hourlyCounts && activity.hourlyCounts.length > 0) {
      const maxCount = Math.max.apply(null, activity.hourlyCounts.map(function(h) { return h.count; })) || 1;
      html += '<div class="card"><h3>오늘 시간대별 클릭 현황</h3>'
            + '<div style="display:flex;align-items:flex-end;gap:3px;height:90px;margin-top:10px">';
      activity.hourlyCounts.forEach(function(h) {
        const barH = Math.round((h.count / maxCount) * 80);
        const label = h.hour < 10 ? '0' + h.hour : '' + h.hour;
        html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px" title="' + h.hour + '시: ' + h.count + '회">'
              + '<div style="width:100%;background:var(--pri);border-radius:2px 2px 0 0;height:' + barH + 'px;min-height:' + (h.count > 0 ? 2 : 0) + 'px"></div>'
              + '<div style="font-size:9px;color:var(--muted)">' + label + '</div>'
              + '</div>';
      });
      html += '</div></div>';
    }

    // 생성 시각
    if (d.generatedAt) {
      let ts = d.generatedAt;
      try { ts = new Date(Array.isArray(d.generatedAt) ? d.generatedAt[0] + '-' + String(d.generatedAt[1]).padStart(2,'0') + '-' + String(d.generatedAt[2]).padStart(2,'0') : d.generatedAt).toLocaleString('ko-KR'); } catch {}
      html += '<div style="font-size:11px;color:var(--muted);text-align:right;margin-top:4px">생성시각: ' + ts + '</div>';
    }

    document.getElementById('dashStats').innerHTML = html;
  } catch (e) {
    document.getElementById('dashStats').innerHTML = '<div class="stat"><div class="l">로드 실패: ' + esc(e.message) + '</div></div>';
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
  const rawExtra = data?.extraJson;
  const rawExtraStr = rawExtra
    ? (typeof rawExtra === 'string' ? rawExtra : JSON.stringify(rawExtra, null, 2))
    : '';
  document.getElementById('eventExtraJson').value = rawExtraStr;
  let parsedForEditor = null;
  try { parsedForEditor = rawExtraStr ? JSON.parse(rawExtraStr) : null; } catch {}
  initPerformerEditor(parsedForEditor);
  document.getElementById('eventThumbKey').value = data?.thumbnailKey || data?.thumbnailUrl || '';
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
  // 최신 소식 (extraJson.news) 로드
  let news = [];
  try {
    if (data?.extraJson) {
      const parsed = JSON.parse(data.extraJson);
      if (Array.isArray(parsed?.news)) news = parsed.news;
    }
  } catch (_) { news = []; }
  _eventExtraCache = (() => {
    try { return data?.extraJson ? JSON.parse(data.extraJson) : {}; } catch (_) { return {}; }
  })();
  renderNewsList(news);
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
    extraJson: buildExtraJson(),
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

// ===== Performer Editor =====
let _perfTimelineIdx = -1;

function initPerformerEditor(parsed) {
  _perfTimelineIdx = -1;
  let performers = [];
  if (parsed && Array.isArray(parsed.timeline)) {
    for (let i = 0; i < parsed.timeline.length; i++) {
      if (Array.isArray(parsed.timeline[i].performers)) {
        _perfTimelineIdx = i;
        performers = parsed.timeline[i].performers;
        break;
      }
    }
  }
  renderPerformerList(performers);
}

function renderPerformerList(performers) {
  const list = document.getElementById('performerList');
  if (!list) return;
  if (!performers || performers.length === 0) {
    list.innerHTML = '<p style="font-size:13px;color:var(--muted);margin:0">공연 팀이 없습니다. "+ 팀 추가"로 추가하세요.</p>';
    return;
  }
  list.innerHTML = performers.map((p, i) => `
    <div class="performer-card">
      <div class="performer-header">
        <input class="perf-name" type="text" placeholder="팀 이름" value="${esc(p.name||'')}" style="width:130px;font-weight:600">
        <input class="perf-genre" type="text" placeholder="장르" value="${esc(p.genre||'')}" style="width:90px">
        <input class="perf-time" type="text" placeholder="시작시간 예)19:53" value="${esc(p.startTime||'')}" style="width:110px">
        <button type="button" onclick="removePerformerRow(${i})" class="btn btn-d btn-sm" style="padding:3px 10px;margin-left:auto">팀 삭제</button>
      </div>
      <div class="setlist-wrap">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">셋리스트</div>
        ${(p.setlist||[]).map((song, si) => `
          <div class="song-row">
            <span class="song-num">${si+1}.</span>
            <input class="song-input" type="text" value="${esc(song)}" placeholder="곡명 - 아티스트">
            <button type="button" onclick="removeSongRow(${i},${si})" class="btn btn-d btn-sm" style="padding:2px 8px;font-size:12px">×</button>
          </div>
        `).join('')}
        <button type="button" onclick="addSongRow(${i})" class="btn btn-g btn-sm" style="font-size:12px;margin-top:6px">+ 곡 추가</button>
      </div>
    </div>
  `).join('');
}

function getPerformersFromEditor() {
  const performers = [];
  document.querySelectorAll('#performerList .performer-card').forEach(card => {
    performers.push({
      name: card.querySelector('.perf-name').value.trim(),
      genre: card.querySelector('.perf-genre').value.trim(),
      startTime: card.querySelector('.perf-time').value.trim(),
      setlist: Array.from(card.querySelectorAll('.song-input')).map(i => i.value.trim()).filter(Boolean),
    });
  });
  return performers;
}

function addPerformerRow() {
  const current = getPerformersFromEditor();
  current.push({ name: '', genre: '', startTime: '', setlist: [] });
  if (_perfTimelineIdx < 0) _perfTimelineIdx = 0;
  renderPerformerList(current);
  setTimeout(() => {
    const cards = document.querySelectorAll('#performerList .performer-card');
    if (cards.length) cards[cards.length - 1].querySelector('.perf-name').focus();
  }, 30);
}

function removePerformerRow(idx) {
  const current = getPerformersFromEditor();
  current.splice(idx, 1);
  renderPerformerList(current);
}

function addSongRow(perfIdx) {
  const current = getPerformersFromEditor();
  if (!current[perfIdx]) return;
  current[perfIdx].setlist.push('');
  renderPerformerList(current);
  setTimeout(() => {
    const cards = document.querySelectorAll('#performerList .performer-card');
    if (cards[perfIdx]) {
      const inputs = cards[perfIdx].querySelectorAll('.song-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }
  }, 30);
}

function removeSongRow(perfIdx, songIdx) {
  const current = getPerformersFromEditor();
  if (!current[perfIdx]) return;
  current[perfIdx].setlist.splice(songIdx, 1);
  renderPerformerList(current);
}

function toggleExtraJsonRaw() {
  const ta = document.getElementById('eventExtraJson');
  ta.style.display = ta.style.display === 'none' ? '' : 'none';
}

function buildExtraJson() {
  const rawText = document.getElementById('eventExtraJson').value.trim();
  // 1) raw textarea가 있으면 그걸 base, 없으면 _eventExtraCache 사용 (기존 키 보존)
  let base = {};
  try {
    base = rawText ? JSON.parse(rawText) : { ..._eventExtraCache };
  } catch {
    base = { ..._eventExtraCache };
  }

  // 2) performers를 timeline에 반영
  const performers = getPerformersFromEditor();
  if (performers.length > 0 && _perfTimelineIdx >= 0) {
    if (base.timeline && base.timeline[_perfTimelineIdx]) {
      base.timeline[_perfTimelineIdx].performers = performers;
    }
  }

  // 3) news 항목 수집 (소식 편집기)
  const newsWrap = document.getElementById('eventNewsList');
  if (newsWrap) {
    const news = [];
    newsWrap.querySelectorAll('.news-row').forEach((row) => {
      const title = row.querySelector('.news-title').value.trim();
      const body = row.querySelector('.news-body').value;
      const date = row.querySelector('.news-date').value.trim();
      const imageUrls = Array.from(row.querySelectorAll('.news-thumbs img')).map((img) => img.dataset.url || img.src);
      if (!title && !body && imageUrls.length === 0) return;
      news.push({
        id: row.dataset.id,
        title,
        body,
        date,
        ...(imageUrls.length > 0 ? { imageUrls } : {}),
      });
    });
    if (news.length > 0) base.news = news;
    else delete base.news;
  }

  return Object.keys(base).length > 0 ? JSON.stringify(base) : null;
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

// ===== Event News (extraJson.news) =====
let _eventExtraCache = {};

function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function renderNewsList(news) {
  const wrap = document.getElementById('eventNewsList');
  if (!wrap) return;
  wrap.innerHTML = '';
  (news || []).forEach((n) => wrap.appendChild(buildNewsRow(n)));
}

function buildNewsRow(item) {
  const row = document.createElement('div');
  row.className = 'news-row';
  row.dataset.id = item.id || String(Date.now()) + Math.random().toString(36).slice(2, 6);
  row.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px;background:#fafafa';
  const imgs = Array.isArray(item.imageUrls) ? item.imageUrls : [];
  row.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 160px;gap:10px">
      <div>
        <input type="text" class="news-title" placeholder="소식 제목" value="${escAttr(item.title || '')}" style="width:100%;margin-bottom:6px">
        <textarea class="news-body" placeholder="내용 (줄바꿈 가능)" rows="4" style="width:100%;margin-bottom:6px;resize:vertical">${escAttr(item.body || '')}</textarea>
        <input type="text" class="news-date" placeholder="날짜 (예: 2025.05.10)" value="${escAttr(item.date || '')}" style="width:100%">
      </div>
      <div>
        <div class="news-dropzone" style="border:1px dashed var(--border);border-radius:8px;padding:10px;text-align:center;cursor:pointer;font-size:12px;color:var(--muted)">이미지 드래그 또는 클릭</div>
        <input type="file" class="news-file" accept="image/*" style="display:none">
        <div class="news-thumbs" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px"></div>
      </div>
    </div>
    <div style="text-align:right;margin-top:8px">
      <button type="button" class="btn btn-d btn-sm news-remove">삭제</button>
    </div>
  `;
  // 이미지 썸네일
  const thumbs = row.querySelector('.news-thumbs');
  imgs.forEach((url) => thumbs.appendChild(buildNewsThumb(url)));
  // 드래그/드롭/클릭 업로드
  const zone = row.querySelector('.news-dropzone');
  const fileInput = row.querySelector('.news-file');
  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.background = '#eef2ff'; });
  zone.addEventListener('dragleave', () => { zone.style.background = ''; });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) uploadNewsImage(file, thumbs, zone);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) uploadNewsImage(fileInput.files[0], thumbs, zone);
    fileInput.value = '';
  });
  row.querySelector('.news-remove').addEventListener('click', () => row.remove());
  return row;
}

function buildNewsThumb(url) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:54px;height:54px';
  wrap.innerHTML = `
    <img src="${escAttr(url)}" data-url="${escAttr(url)}" style="width:54px;height:54px;border-radius:6px;object-fit:cover;background:#e5e7eb">
    <button type="button" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:9px;border:none;background:#111827;color:#fff;font-size:11px;line-height:1;cursor:pointer">×</button>
  `;
  wrap.querySelector('button').addEventListener('click', () => wrap.remove());
  return wrap;
}

async function uploadNewsImage(file, thumbsEl, zoneEl) {
  const original = zoneEl.textContent;
  zoneEl.textContent = '업로드 중...';
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
    thumbsEl.appendChild(buildNewsThumb(data.url));
  } catch (e) {
    alert(e.message);
  } finally {
    zoneEl.textContent = original;
  }
}

function addNewsItem() {
  const wrap = document.getElementById('eventNewsList');
  if (!wrap) return;
  wrap.appendChild(buildNewsRow({ id: String(Date.now()), title: '', body: '', date: '', imageUrls: [] }));
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
