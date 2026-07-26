# Product Discovery PRD Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo skill repo-scoped hướng dẫn Codex nghiên cứu sản phẩm và viết PRD sau khi người dùng duyệt phạm vi.

**Architecture:** Skill nằm tại `.agents/skills/product-discovery-prd/`. `SKILL.md` điều phối workflow ngắn gọn; hai reference cung cấp checklist nghiên cứu và template PRD theo progressive disclosure. Metadata UI chỉ mô tả skill, không khai báo dependency hay script.

**Tech Stack:** Markdown, YAML frontmatter, Codex repo-scoped skills, `init_skill.py`, `quick_validate.py`.

## Global Constraints

- Chỉ tạo trong repository tại `.agents/skills/product-discovery-prd/`.
- Frontmatter chỉ có `name` và `description`; tên là kebab-case.
- Skill chỉ bao phủ Product Discovery và PRD, không thực hiện SRS, data model, kiến trúc chi tiết, UI hoặc code.
- Phải phỏng vấn khi thiếu thông tin trọng yếu và bắt buộc chờ duyệt phạm vi trước khi viết PRD.
- Viết theo quy ước ngôn ngữ của repository hoặc yêu cầu người dùng.

---

### Task 1: Khởi tạo và viết workflow chính

**Files:**
- Create: `.agents/skills/product-discovery-prd/SKILL.md`
- Create: `.agents/skills/product-discovery-prd/agents/openai.yaml`

**Interfaces:**
- Consumes: Thiết kế `docs/superpowers/specs/2026-07-25-product-discovery-prd-skill-design.md` và quy ước `AGENTS.md`.
- Produces: Skill có metadata kích hoạt chính xác và workflow buộc duyệt phạm vi.

- [ ] Khởi tạo skill bằng `init_skill.py` với path `.agents/skills`, resource `references` và interface: `Product Discovery & PRD`.
- [ ] Viết frontmatter `name: product-discovery-prd` cùng description nêu rõ trigger Product Discovery/PRD và ranh giới không bao gồm SRS, data model, architecture, UI hoặc code.
- [ ] Viết workflow mệnh lệnh: khám phá dự án, phỏng vấn từng câu, nghiên cứu nguồn, phân loại evidence/inference/assumption, đề xuất phạm vi, chờ duyệt, viết PRD, tự rà và báo cáo.
- [ ] Kiểm tra `SKILL.md` và `agents/openai.yaml` để xác nhận metadata khớp thiết kế.

### Task 2: Thêm reference tái sử dụng

**Files:**
- Create: `.agents/skills/product-discovery-prd/references/research-checklist.md`
- Create: `.agents/skills/product-discovery-prd/references/prd-template.md`

**Interfaces:**
- Consumes: Workflow trong `SKILL.md`.
- Produces: Checklist thực chứng và template PRD mà workflow có thể nạp khi cần.

- [ ] Viết `research-checklist.md` gồm câu hỏi nghiên cứu, ưu tiên nguồn chính thức/sơ cấp, bảng evidence–inference–assumption–decision, nguyên tắc dùng nguồn user chỉ định và không suy diễn từ sự vắng mặt của thông tin.
- [ ] Viết `prd-template.md` gồm metadata, bối cảnh, nghiên cứu, persona, quyết định/phạm vi, `FR-*`/`NFR-*`/`BR-*`, luồng, tiêu chí nghiệm thu, rủi ro và quyết định tiếp theo.
- [ ] Liên kết hai reference từ `SKILL.md` đúng theo thời điểm cần nạp và kiểm tra tệp không rỗng.

### Task 3: Xác thực skill và tích hợp repository

**Files:**
- Modify: `docs/architecture/folder-structure.md`
- Modify: `README.md`
- Modify: `scripts/verify-structure.mjs`

**Interfaces:**
- Consumes: Cấu trúc skill đã tạo và quy ước cấu trúc repository.
- Produces: Bản đồ repository ghi nhận `.agents/skills/`; verifier yêu cầu `SKILL.md` tồn tại.

- [ ] Thêm `.agents/skills/` vào cây repository, bảng quy tắc và README map; mô tả đây là skill Codex chỉ áp dụng trong repository.
- [ ] Thêm `.agents/skills/product-discovery-prd/SKILL.md` vào `requiredPaths` của verifier.
- [ ] Chạy `python3 /Users/hoangduoc/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/product-discovery-prd` và sửa mọi lỗi báo cáo.
- [ ] Chạy `node scripts/verify-structure.mjs` và `node --check scripts/verify-structure.mjs`; cả hai phải exit 0.
