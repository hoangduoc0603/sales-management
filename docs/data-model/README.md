# Mô hình dữ liệu

- [Logical data model](logical-data-model.md): thực thể, ledger, snapshot, định danh và ownership dữ liệu.
- [Storage partitioning và lifecycle](storage-partitioning-and-lifecycle.md): Google Sheets/Drive physical layout, routing, archive, backup và retention.
- [Sheet schema and registry](sheet-schema-and-registry.md): TableRegistry, header mapping, hybrid row schema, migration và batch I/O.
- [Table dictionaries](tables/): schema vật lý theo nhóm domain.
- [Sales and Inventory tables](tables/sales-inventory.md): schema Sales/POS/Return và Inventory.
- [Purchasing and Finance tables](tables/purchasing-finance.md): schema Purchasing, payment/công nợ, quỹ/ca và chi phí.
- [Operations and Reporting tables](tables/operations-reporting.md): schema quyền, runtime, import/export, backup/restore và report projection; audit table cũ chỉ còn là legacy, không thuộc baseline ADR 0017.

Schema Sheet chi tiết chỉ được tạo sau logical model này và bộ SRS; không được coi số dòng Sheet là khóa dữ liệu.
