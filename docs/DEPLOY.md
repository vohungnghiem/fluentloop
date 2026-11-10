# FLUENTLOOP – DEPLOY

## Hiện tại: GitHub Pages (repo public)
- App: https://vohungnghiem.github.io/fluentloop/
- Mỗi lần push lên `main`: workflow `.github/workflows/pages.yml` chạy `npm test` rồi `npm run build:pages` (build với `BASE_PATH=/fluentloop/`) và deploy.
- GitHub Pages miễn phí chỉ chạy với repo **public**. Đổi repo sang private khi đang ở gói Free thì link sẽ ngừng hoạt động.

## Để dành: chuyển sang repo private + Cloudflare Pages (miễn phí)
Làm theo đúng thứ tự, để app không bị gián đoạn.

### 1. Bạn làm một lần (cần trình duyệt)
```bash
cd ~/dev-external-websites/fluentloop
npx wrangler login        # mở trình duyệt, đăng nhập hoặc tạo tài khoản Cloudflare miễn phí
```

### 2. Deploy thử lên Cloudflare từ máy
App chạy ở gốc `/` trên Cloudflare, nên dùng `npm run build` thường, không dùng `build:pages`:
```bash
npm run build
cp dist/index.html dist/404.html              # link sâu (/settings…) vẫn mở được app
npx wrangler pages project create fluentloop --production-branch main
npx wrangler pages deploy dist --project-name fluentloop
```
Lệnh cuối in ra link dạng `https://fluentloop.pages.dev`. Mở link, học thử một phiên.

> Cloudflare Pages tự xử lý SPA: nếu không có `404.html`, mọi đường dẫn lạ đều trả về `index.html`. Bước `cp` ở trên là để chắc chắn.

### 3. Cho GitHub tự deploy lên Cloudflare mỗi lần push
1. Trên Cloudflare: **My Profile → API Tokens → Create Token**, chọn mẫu **Edit Cloudflare Workers** (có quyền Pages), rồi copy token.
2. Lấy Account ID: chạy `npx wrangler whoami`.
3. Lưu hai giá trị này thành secret của repo (không bao giờ commit chúng):
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN      # dán token khi được hỏi
   gh secret set CLOUDFLARE_ACCOUNT_ID     # dán account id
   ```
4. Thay nội dung `.github/workflows/pages.yml` bằng:
   ```yaml
   name: Deploy to Cloudflare Pages
   on:
     push:
       branches: [main]
     workflow_dispatch:
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 24, cache: npm }
         - run: npm ci
         - run: npm test
         - run: npm run build && cp dist/index.html dist/404.html
         - run: npx wrangler pages deploy dist --project-name fluentloop --branch main
           env:
             CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
             CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
   ```
5. Push, rồi kiểm tra tab **Actions** trên GitHub: phải xanh.

### 4. Tắt GitHub Pages và đổi repo sang private
```bash
gh api -X DELETE repos/vohungnghiem/fluentloop/pages
gh repo edit vohungnghiem/fluentloop --visibility private --accept-visibility-change-consequences
```

### 5. Chuyển dữ liệu học sang link mới
Mỗi địa chỉ có dữ liệu riêng trong trình duyệt. Ở link cũ (github.io) vào **Cài đặt → Tải file sao lưu**, rồi ở link mới vào **Cài đặt → Nhập file sao lưu**. Làm việc này **trước** bước 4. Key AI phải nhập lại ở link mới. Trên điện thoại thì cài lại app từ link mới.

Nếu không muốn tự làm, nói với Claude "làm cách 1 deploy Cloudflare" sau khi đã chạy xong `npx wrangler login`.
