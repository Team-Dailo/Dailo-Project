-- 기존 게시글·댓글 삭제 (작성자 표시를 맞추기 위해 DB 초기화)
--
-- 실행 방법 (backend 폴더 기준):
--   mysql -u root -p dailo < scripts/clear-posts.sql
-- 또는 MySQL Workbench/DBeaver에서 dailo 선택 후 이 파일 내용 전체 실행

SET FOREIGN_KEY_CHECKS = 0;

-- 댓글 먼저 삭제 (posts 참조하므로)
DELETE FROM comments;

-- 게시글 삭제 (soft delete 사용 시에도 완전 삭제)
DELETE FROM posts;

SET FOREIGN_KEY_CHECKS = 1;
