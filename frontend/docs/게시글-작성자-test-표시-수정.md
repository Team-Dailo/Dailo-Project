# 게시글 작성자가 모두 "test"로 표시되는 문제

## 원인

예전에 게시글 작성 시 **작성자 ID가 1번으로만 저장**되는 버그가 있었습니다.  
그래서 DB `posts` 테이블의 `author_id`가 대부분 **1**이고, 1번 회원 닉네임이 "test"라서 **모든 글이 "test" 작성으로 보입니다.**

- **지금**: 새로 쓰는 글은 로그인한 계정 ID로 저장되므로, **앞으로 작성하는 글은 올바른 닉네임**으로 표시됩니다.
- **기존 글**: DB에 이미 `author_id = 1`로 저장된 행은 그대로 두면 계속 "test"로 보입니다.

## 해결 방법

### 1) 테스트/개발 데이터인 경우 (가장 간단)

기존 게시글을 모두 지우고, **각 계정으로 다시 로그인한 뒤 새로 글을 쓰면** 올바른 작성자로 저장·표시됩니다.

**방법 A – 프로젝트에 있는 SQL 스크립트 실행**

1. 터미널에서 백엔드 폴더로 이동한 뒤, MySQL에 스크립트 넣어 실행합니다.
   ```bash
   cd backend
   mysql -u root -p dailo < scripts/clear-posts.sql
   ```
   (비밀번호 입력 후 실행됩니다.)

2. MySQL Workbench, DBeaver 등에서 `dailo` DB 선택 후,  
   `backend/scripts/clear-posts.sql` 파일 내용을 열어서 **전체 선택 → 실행**해도 됩니다.

**방법 B – 직접 SQL 실행**

MySQL 클라이언트에서 `USE dailo;` 한 뒤 아래만 실행합니다.

```sql
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM comments;
DELETE FROM posts;
SET FOREIGN_KEY_CHECKS = 1;
```

이후 앱에서 1번, 2번 계정으로 각각 로그인해서 글을 다시 작성해 보세요.

### 2) 기존 글을 유지하면서 작성자만 수정하는 경우

**어떤 글이 어떤 회원이 쓴 것인지** 알고 있을 때만 사용할 수 있습니다.

1. MySQL 접속 (예: DBeaver, MySQL Workbench, `mysql -u root -p`)
2. DB 선택: `USE dailo;`
3. 현재 상태 확인:

```sql
SELECT id, author_id, title, created_at FROM posts ORDER BY id;
```

4. 특정 글이 2번 회원이 쓴 것이면:

```sql
UPDATE posts SET author_id = 2 WHERE id = 3;   -- 예: id 3번 글을 2번 회원 글로
UPDATE posts SET author_id = 2 WHERE id IN (4, 5, 6);  -- 여러 개 한 번에
```

5. 1번 회원이 쓴 글은 `author_id = 1`로 두면 "test"로 표시됩니다.  
   (1번 회원 닉네임을 "test"가 아닌 값으로 바꾸면, 그 닉네임으로 표시됩니다.)

### 3) 관리자 API로 작성자 변경 (ADMIN 계정이 있을 때)

백엔드에 관리자 전용 API가 있습니다. **ADMIN 권한**이 있는 계정으로 호출하면 DB를 직접 건드리지 않고 작성자를 바꿀 수 있습니다.

```http
PATCH /api/admin/posts/{postId}/author
Content-Type: application/json
Authorization: Bearer {관리자_액세스_토큰}

{ "authorId": 2 }
```

- `postId`: 수정할 게시글 ID  
- `authorId`: 새로 넣을 회원 ID (예: 2번 회원이 쓴 글로 바꾸려면 2)

### 4) 1번 회원 닉네임만 바꾸는 경우

"test" 대신 **1번 계정의 닉네임만** 바꾸고 싶다면:

- 앱에서 1번 계정으로 로그인 → 마이페이지 등에서 **닉네임 변경**,  
  또는
- DB에서 직접: `UPDATE members SET nickname = '원하는이름' WHERE id = 1;`

이후 1번이 쓴 글은 모두 "원하는이름"으로 표시됩니다.  
(다른 회원이 쓴 글은 여전히 `author_id`가 1로 잘못 저장돼 있으면 "원하는이름"으로 보이므로, 정확히 하려면 위 2)처럼 `author_id`를 수정해야 합니다.)

---

**요약**:  
- **새 글** → 이미 수정된 로직으로 올바른 작성자로 저장·표시됨.  
- **기존 글** → DB에서 `posts.author_id`를 올바른 회원 ID로 수정하거나, 테스트 데이터면 삭제 후 다시 작성하면 됩니다.
