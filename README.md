# Ôn Thi Đại Lý Bảo Hiểm

Web app/PWA ôn thi chứng chỉ đại lý bảo hiểm, dùng được trên Android, iPhone và máy tính.

## Chức năng
- 595 câu hỏi, chia 5 nhóm tên đầy đủ.
- Ôn theo nhóm: trả lời, xem đúng/sai, giải thích và mẹo ghi nhớ.
- 15 bộ đề, 40 câu/đề, đạt từ 30/40.
- Hai chế độ thi: hiện đáp án sau từng câu hoặc chỉ hiện sau khi nộp đủ đề.
- 14 đề đầu không trùng câu; đề 15 gồm 35 câu còn lại + 5 câu lặp.
- Tự gom câu sai để ôn lại.
- Lưu tiến độ bằng localStorage trên thiết bị.
- Có PWA/service worker để thêm vào màn hình chính và hỗ trợ dùng lại khi mất mạng sau lần tải đầu.

## Chạy thử
Mở bằng một web server tĩnh, ví dụ VS Code Live Server hoặc `python -m http.server 8080`.

## Đưa lên GitHub Pages
Repo đã kèm workflow `.github/workflows/deploy-pages.yml`. Sau khi upload lên GitHub, vào Settings → Pages → Source chọn GitHub Actions. Workflow sẽ tự deploy khi push lên nhánh `main`.
