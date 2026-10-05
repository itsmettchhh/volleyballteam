# 🏐 Volley Planner

Web xếp đội hình và theo dõi 6 vòng xoay bóng chuyền.

## Chạy miễn phí bằng GitHub Pages

1. Tạo một repository mới trên GitHub, ví dụ `volley-planner`.
2. Upload **3 file**:
   - `index.html`
   - `style.css`
   - `app.js`
3. Vào **Settings → Pages**.
4. Ở **Build and deployment**, chọn:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. Bấm Save.
6. Sau vài phút, GitHub sẽ cấp URL dạng:
   `https://TEN-GITHUB-CUA-BAN.github.io/volley-planner/`

Không cần Node.js, npm hoặc server.

## Tính năng V1

- Đội hình 6 cầu thủ.
- Thêm cầu thủ, số áo, vị trí và ảnh.
- Kéo thả cầu thủ vào 6 vị trí ở Rotation 1.
- Tự động tạo Rotation 1 → 6.
- Nút xoay trước / xoay tiếp.
- Auto Rotation.
- Bảng tổng hợp toàn bộ 6 vòng.
- Chế độ trình chiếu fullscreen.
- Lưu đội hình bằng LocalStorage.
- Responsive cho máy tính và điện thoại.

## Lưu ý

Bản V1 lưu dữ liệu trên chính trình duyệt đang sử dụng. Nếu mở trên máy khác, dữ liệu chưa tự đồng bộ. Có thể nâng cấp Supabase ở V2.
