export interface SkeletonProps {
  lines?: number;
}

export function Skeleton({ lines = 1 }: SkeletonProps) {
  return (
    <div aria-label="Đang tải" className="cn-skeleton">
      {Array.from({ length: lines }).map((_, index) => (
        <span className="cn-skeleton-line" key={index} />
      ))}
    </div>
  );
}
