## [1.1.1](https://github.com/St1ggy/cinetracker/compare/v1.1.0...v1.1.1) (2026-02-23)

### Bug Fixes

* move ignoreCommand to vercel.json with correct semicolons ([eeb2360](https://github.com/St1ggy/cinetracker/commit/eeb2360bed5c041fdf7b19eeadbe9c8c50f9bb85))

## [1.1.0](https://github.com/St1ggy/cinetracker/compare/v1.0.3...v1.1.0) (2026-02-23)

### Features

* bold UI refresh across all pages ([ef5039d](https://github.com/St1ggy/cinetracker/commit/ef5039d2499449cf5bbbc3f6a8cba7d3fa6e2d71))

## [1.0.3](https://github.com/St1ggy/cinetracker/compare/v1.0.2...v1.0.3) (2026-02-23)

### Bug Fixes

* avoid invalid secrets expression in migrate workflow ([ffeb385](https://github.com/St1ggy/cinetracker/commit/ffeb385a4ba2286199b91de413ba2208ca70bb77))

## [1.0.2](https://github.com/St1ggy/cinetracker/compare/v1.0.1...v1.0.2) (2026-02-23)

### Bug Fixes

* make migrate workflow resilient without vercel creds ([22d7373](https://github.com/St1ggy/cinetracker/commit/22d7373a33dd62144fcc84d984b731084bc69bdf))

## [1.0.1](https://github.com/St1ggy/cinetracker/compare/v1.0.0...v1.0.1) (2026-02-23)

### Bug Fixes

* grant workflow token permission to publish statuses ([f79593b](https://github.com/St1ggy/cinetracker/commit/f79593b68b9ed1a35ae46ddbbdfdc9c91f5b9d26))

## 1.0.0 (2026-02-23)

### Features

* add Auth.js authentication with Google OAuth ([221c6c0](https://github.com/St1ggy/cinetracker/commit/221c6c09bfb36c8376ad17dd64a8561a9ce8f8bb))
* add enrichment engine and repository methods for multi-source data ([e9b9480](https://github.com/St1ggy/cinetracker/commit/e9b94802bdd9d8e9afcafb3512ebd7216b2e8fe7))
* add i18n support via Paraglide.js ([7e1d307](https://github.com/St1ggy/cinetracker/commit/7e1d307d554cc1c539e65131b392b6376a1538d5))
* add MediaRating model and enrichment fields to schema ([69bfc95](https://github.com/St1ggy/cinetracker/commit/69bfc95d1e1d5ba67d47eb3c80f03d3a34034f08))
* add server-side services and API routes ([42d556f](https://github.com/St1ggy/cinetracker/commit/42d556f16f82335948076a6275d49f12cee54e17))
* add shadcn-svelte UI component library ([fe46db6](https://github.com/St1ggy/cinetracker/commit/fe46db67e85d8e7c2078d2145650c87103995131))
* delete media from list and simplify filter bar ([e509285](https://github.com/St1ggy/cinetracker/commit/e50928501c6e8377e329e4cde23d2c804ce87b2f))
* display app version below language/theme switcher in sidebar ([d547712](https://github.com/St1ggy/cinetracker/commit/d547712198af43908b5e1816381ea8ee71abc7f0))
* enrich provider adapters with ratings, cast, and externalUrl ([11dcd0b](https://github.com/St1ggy/cinetracker/commit/11dcd0b511eb7daf6017d737e5440a4099cc13ef))
* full-height add button with per-item loader, scroll fade effect ([498c63d](https://github.com/St1ggy/cinetracker/commit/498c63d89c36a0a06b6e42e9edcb1d496fc0799d))
* implement FSD architecture with pages, features, and widgets ([98ba497](https://github.com/St1ggy/cinetracker/commit/98ba4976c7d090141e3a52301ac7bdca30d2d8a7))
* improve UX for profile, search results, and sidebar ([5e46be4](https://github.com/St1ggy/cinetracker/commit/5e46be4662bd915f1bda46147a880ae68ee9d6bd))
* public lists catalog with tags, ratings, and username system ([b88787b](https://github.com/St1ggy/cinetracker/commit/b88787b058633a37b17a5d92d478ac2cbf27f652))
* public user profile page at /u/[handle] ([4a2f771](https://github.com/St1ggy/cinetracker/commit/4a2f7714f44567ed891210c0f2b3087f43267932))
* reset enriched_at for user media on API key change ([480c2c4](https://github.com/St1ggy/cinetracker/commit/480c2c4a486a5e5ef2c25ee74f64be2ba2d6909c))
* set up Prisma ORM and database schema ([3c8d84d](https://github.com/St1ggy/cinetracker/commit/3c8d84d03436ce8d6512bcca8df50ba3f2cd6e30))
* show all errors, warnings and successes as toasts (bottom-right) ([1f1c7ca](https://github.com/St1ggy/cinetracker/commit/1f1c7ca9d4235b3c5182f39be8eb3385df6c392a))
* show anonymous badge on owned lists in /lists page ([8e8c3b4](https://github.com/St1ggy/cinetracker/commit/8e8c3b43db9a1a418a8fccb6fa1cd76a4e444ff6))
* show enriched multi-source data on media details screen ([e9f2cb0](https://github.com/St1ggy/cinetracker/commit/e9f2cb028d3df6d53dcab38dc6c9b81fdae69793))
* sorting and view modes (grid / compact / list) on home page ([00e4079](https://github.com/St1ggy/cinetracker/commit/00e4079256e8b960fa5c015f1b437448dfc362eb))

### Bug Fixes

* align CI env and runtime for migrate and release ([e476659](https://github.com/St1ggy/cinetracker/commit/e476659d40b0e4bea8caa9233a2162bb8329a7c3))
* disable husky hooks during semantic-release in CI ([de798fd](https://github.com/St1ggy/cinetracker/commit/de798fd748913b91f4010bd83b547fb325ce3737))
* discover cross-reference IDs from existing sources before enrichment ([3beb034](https://github.com/St1ggy/cinetracker/commit/3beb0341d2da8f3d3262c1be30263fb3fc9784eb))
* exclude anonymous lists from public user profile page ([1ae1d6d](https://github.com/St1ggy/cinetracker/commit/1ae1d6d3ebfc453b699f6f572761a988ea1566ba))
* hide author in list detail page for anonymous lists ([63c500b](https://github.com/St1ggy/cinetracker/commit/63c500bb9b8ddfee980e9a9a7260904d1ca8ba4c))
* hide header on desktop, removing empty auth strip ([4bb1c89](https://github.com/St1ggy/cinetracker/commit/4bb1c891033983bc896a9d2eaf4053f82530b9e5))
* hide list interactions (save/unsave) for unauthenticated users ([8fd0e81](https://github.com/St1ggy/cinetracker/commit/8fd0e81c3b6b52df2c9ca60629eb58e28a059242))
* make page data reactive so lists update after adding media ([1414e3e](https://github.com/St1ggy/cinetracker/commit/1414e3ef64878aff956a529d6fad0d02cea420b9))
* neater sidebar footer, fix semantic-release credentials ([468248a](https://github.com/St1ggy/cinetracker/commit/468248a14bd87b98f191644becfa1e1d9ff3c1fe))
* quote vercel check names in workflows ([404b2c5](https://github.com/St1ggy/cinetracker/commit/404b2c59f506cfc9ccfadb70cc1009b0192ee3f9))
* reliable list refresh and Trakt search diagnostics ([016d863](https://github.com/St1ggy/cinetracker/commit/016d8638077d8e7c3dc9d7f4459ddfebea4049aa))
* remove bun.lock to prevent Vercel package manager conflict ([1313fbe](https://github.com/St1ggy/cinetracker/commit/1313fbe97d65789e13b8a62746572b08f4666801))
* remove deprecated @types/dompurify ([7defd8f](https://github.com/St1ggy/cinetracker/commit/7defd8f9003cf492e60a1d33b87eb97b699d0d2b))
* remove duplicated migrate workflow block ([2e8c459](https://github.com/St1ggy/cinetracker/commit/2e8c459bb43372558736b9b86cba9dfef3226707))
* run migrate and release tooling with stable Node runtime ([cc67de6](https://github.com/St1ggy/cinetracker/commit/cc67de62fe9c0fb2f4cd9b22d163e0b48b2bc4af))
* run prisma migrate deploy on Vercel build to apply DB migrations ([535c74e](https://github.com/St1ggy/cinetracker/commit/535c74e4e0ceb9b01a66e224576c011a4540eb06))
* run svelte-kit sync in buildCommand before vite build ([ee697ba](https://github.com/St1ggy/cinetracker/commit/ee697ba2b5fd15b71adc45e81508e87549d40061))
* set install-phase env vars via installCommand in vercel.json ([166aa2f](https://github.com/St1ggy/cinetracker/commit/166aa2f6cd1ccae3b66f6981ec6e91ee2eb0555e))
* skip heavy binary downloads during Vercel npm install ([fd96419](https://github.com/St1ggy/cinetracker/commit/fd964194c42c1db311bc7af4fc31a7e1c6c0f81f))
* switch to Bun for Vercel install to avoid npm timeout ([664a1aa](https://github.com/St1ggy/cinetracker/commit/664a1aa9ea2099cbffeb5aee6376999dec9a0090))
* switch to npm ci to reduce memory usage during Vercel install ([97e0cdf](https://github.com/St1ggy/cinetracker/commit/97e0cdf58ff4f633a5f4347be1bc2a2dc1b409f8))
* update Trakt API key instructions — remove PIN step, add direct link ([02446a3](https://github.com/St1ggy/cinetracker/commit/02446a3c7f4301804079eeb3b510a1ac148b1483))
* use npm install --ignore-scripts to avoid Prisma binary timeout ([9361272](https://github.com/St1ggy/cinetracker/commit/93612727348c8316b2eda0330e1cdc5506e9171a))
