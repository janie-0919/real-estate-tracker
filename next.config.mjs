import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SCSS 모듈이 `@use 'styles/tokens'` 형태로 src 기준 경로를 해석하도록 함
  // (Vite의 `@/` 별칭을 Next sass가 모르기 때문에 src를 includePaths에 추가)
  sassOptions: {
    includePaths: [path.join(__dirname, 'src')],
  },
};

export default nextConfig;
