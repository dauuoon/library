# LexiNote — personal dictionary MVP

Single-user dictionary/wiki style UI focused on fast search and skim reading.

## Features
- Search-first home with recent viewed/added strips and quick add button
- Search results with title + one-line summary previews
- Entry detail with tags, categories, image, YouTube embed, and related suggestions
- Category view and filter
- Add/Edit form with optional image/YouTube and lightweight tagging (max 2 categories)
- Mock data stored client-side

## Run locally
```bash
npm install
npm run dev             # 기본 개발 서버
npm run fetch           # 노션 → data.json 동기화
npm run dev:fetch       # fetch 후 곧바로 dev 서버 시작
```

Then open the dev server URL shown in the terminal.

## Notion & GitHub Actions
- 로컬 비밀키: `.env.local`에 `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_BOOKS_DATABASE_ID`, `NOTION_MOVIE_DATABASE_ID`, `NOTION_COMMONS_DATABASE_ID` 설정 (커밋 금지, 이미 .gitignore 포함).
- 원격 비밀키: GitHub repo → Settings → Secrets and variables → Actions에 동일 키로 등록 후 워크플로가 사용.
- 자동화: `.github/workflows/fetch-and-build.yml`는 main 푸시 및 매일 04:00 UTC에 `npm run fetch` → `npm run build` 실행. 필요 시 마지막 단계에 Pages/S3/Vercel 배포 스텝을 추가해 배포 자동화 가능.
