import type { CSSProperties } from 'react';

export interface SkeletonTextProps {
  decorative?: boolean;
  lines?: number;
  label?: string;
  className?: string;
}

export interface SkeletonCardProps {
  bodyLines?: number;
  className?: string;
  decorative?: boolean;
  label?: string;
  titleLines?: number;
}

export interface SkeletonTableProps {
  className?: string;
  columns?: number;
  decorative?: boolean;
  label?: string;
  rows?: number;
}

export interface SkeletonPageProps {
  className?: string;
  kind?: 'dashboard' | 'detail' | 'form' | 'table';
  label?: string;
}

export type SkeletonProps = SkeletonTextProps;

export function Skeleton({ lines = 1, label = 'Đang tải', className }: SkeletonProps) {
  return <SkeletonText className={className} label={label} lines={lines} />;
}

export function SkeletonText({
  decorative = false,
  lines = 1,
  label = 'Đang tải',
  className,
}: SkeletonTextProps) {
  return (
    <div
      aria-busy={decorative ? undefined : true}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={joinClassNames('cn-skeleton', className)}
      role={decorative ? undefined : 'status'}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <span aria-hidden="true" className="cn-skeleton-line cn-skeleton-block" key={index} />
      ))}
    </div>
  );
}

export function SkeletonCard({
  bodyLines = 3,
  className,
  decorative = false,
  label = 'Đang tải nội dung',
  titleLines = 1,
}: SkeletonCardProps) {
  return (
    <section
      aria-busy={decorative ? undefined : true}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={joinClassNames('cn-skeleton-card', className)}
      role={decorative ? undefined : 'status'}
    >
      <div className="cn-skeleton-card-head">
        {Array.from({ length: titleLines }).map((_, index) => (
          <span aria-hidden="true" className="cn-skeleton-title cn-skeleton-block" key={index} />
        ))}
      </div>
      <div className="cn-skeleton-card-body">
        {Array.from({ length: bodyLines }).map((_, index) => (
          <span aria-hidden="true" className="cn-skeleton-line cn-skeleton-block" key={index} />
        ))}
      </div>
    </section>
  );
}

export function SkeletonTable({
  className,
  columns = 4,
  decorative = false,
  label = 'Đang tải bảng dữ liệu',
  rows = 5,
}: SkeletonTableProps) {
  const style = { '--cn-skeleton-columns': columns } as CSSProperties;

  return (
    <div
      aria-busy={decorative ? undefined : true}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={joinClassNames('cn-skeleton-table', className)}
      role={decorative ? undefined : 'status'}
      style={style}
    >
      <div aria-hidden="true" className="cn-skeleton-table-head">
        {Array.from({ length: columns }).map((_, index) => (
          <span className="cn-skeleton-table-head-cell" key={index}>
            <span className="cn-skeleton-block" />
          </span>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div aria-hidden="true" className="cn-skeleton-table-row" key={rowIndex}>
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <span className="cn-skeleton-table-cell" key={columnIndex}>
              <span className="cn-skeleton-block" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage({
  className,
  kind = 'dashboard',
  label = 'Đang tải màn hình',
}: SkeletonPageProps) {
  if (kind === 'table') {
    return (
      <main
        aria-busy="true"
        aria-label={label}
        className={joinClassNames('cn-skeleton-page', className)}
        data-kind={kind}
        role="status"
      >
        <SkeletonPageHeader />
        <SkeletonTable columns={5} decorative rows={6} />
      </main>
    );
  }

  if (kind === 'form') {
    return (
      <main
        aria-busy="true"
        aria-label={label}
        className={joinClassNames('cn-skeleton-page', className)}
        data-kind={kind}
        role="status"
      >
        <SkeletonPageHeader />
        <SkeletonCard bodyLines={6} decorative titleLines={1} />
      </main>
    );
  }

  if (kind === 'detail') {
    return (
      <main
        aria-busy="true"
        aria-label={label}
        className={joinClassNames('cn-skeleton-page', className)}
        data-kind={kind}
        role="status"
      >
        <SkeletonPageHeader />
        <div className="cn-skeleton-detail-grid">
          <SkeletonCard bodyLines={4} decorative />
          <SkeletonCard bodyLines={4} decorative />
        </div>
      </main>
    );
  }

  return (
    <main
      aria-busy="true"
      aria-label={label}
      className={joinClassNames('cn-skeleton-page', className)}
      data-kind={kind}
      role="status"
    >
      <SkeletonPageHeader />
      <div className="cn-skeleton-metric-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard bodyLines={2} decorative key={index} />
        ))}
      </div>
      <div className="cn-skeleton-dashboard-grid">
        <SkeletonCard bodyLines={6} decorative />
        <SkeletonCard bodyLines={5} decorative />
      </div>
    </main>
  );
}

function SkeletonPageHeader() {
  return (
    <header className="cn-skeleton-page-head">
      <SkeletonText decorative label="Đang tải tiêu đề màn hình" lines={2} />
      <span aria-hidden="true" className="cn-skeleton-action cn-skeleton-block" />
    </header>
  );
}

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ');
}
