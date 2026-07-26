# ADR 0006 — Customer-owned deployment và migration

**Trạng thái:** Accepted  
**Liên quan:** [deployment lifecycle](../architecture/deployment-and-lifecycle.md)

## Bối cảnh

Khách mua một lần, phải sở hữu dữ liệu/môi trường và tiếp tục dùng khi không còn hỗ trợ thường xuyên.

## Quyết định

Installer/deployment/resource/trigger thuộc Google account khách; hỗ trợ Gmail và Workspace, Shared Drive tùy chọn. Mọi upgrade versioned, compatibility checked, backup trước migration; migration có version/idempotency và maintenance mode khi ảnh hưởng write.

## Hệ quả

Không hard-code deployment/resource ID hoặc lưu data trên account nhà cung cấp. Rollback deployment chỉ khi schema compatible; nếu không dùng restore hoặc forward migration. Hỗ trợ bên ngoài là quyền có thời hạn/revocable.

## Phương án không chọn

Deploy/trigger do account nhà cung cấp sở hữu lâu dài hoặc update Head deployment trực tiếp ở production.
