# Lịch việc & thu chi v3 (PWA)

Chạy thử: `npm install` rồi `npm run dev`. Build: `npm run build`.
Chưa có khóa Supabase thì app tự chạy Demo/Offline (localStorage + IndexedDB), không báo lỗi.

## 1. Cập nhật code lên GitHub
1. Giải nén zip, chép toàn bộ vào thư mục repo cũ (ghi đè file trùng, giữ nguyên thư mục `.git`).
2. Xóa `src/LichViecThuChi.jsx` nếu còn (bản mới không dùng).
3. `git add .` -> `git commit -m "v3: lặp hàng tuần, theme"` -> `git push`.
   Không dùng git: vào repo trên github.com > Add file > Upload files, kéo thả file mới (không đưa `node_modules`).
Vercel tự build lại sau khi push.

## 2. Supabase (làm 1 lần; đã làm ở v2 thì chỉ cần chạy lại SQL cho chắc)
1. Supabase > SQL Editor > New query, dán toàn bộ `supabase.sql` > Run.
2. Project Settings > API: chép Project URL và anon (publishable) key. Không dùng khóa service_role.
3. Authentication > URL Configuration: Site URL = link Vercel.
   Authentication > Providers > Email: tắt "Confirm email" nếu muốn dùng ngay sau khi đăng ký.

## 3. Biến môi trường trên Vercel
Settings > Environment Variables, thêm (tick Production, Preview, Development):
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon/publishable key
Sau đó Deployments > ... > Redeploy (bắt buộc, biến chỉ có hiệu lực ở lần build mới).
Chạy local: copy `.env.example` thành `.env` và điền 2 giá trị.

## 4. Tính năng mới v3
- Việc lặp hàng tuần: khi thêm việc, chọn "Hàng tuần (mỗi Thứ X)". Tick từng ngày độc lập.
  Xóa việc lặp: "Xóa chỉ hôm nay" hoặc "Xóa từ tuần này trở đi".
- Theme & hình nền (nút bảng màu trên thanh điều khiển): Cực quang, Sáng tối giản, Kem ấm áp, Xanh sâu, hoặc ảnh của bạn (tự nén, phủ mờ để chữ luôn rõ). Lựa chọn được nhớ trên từng thiết bị.

Đồng bộ theo kiểu "bản mới nhất thắng" cho toàn bộ dữ liệu tài khoản.
