export const LoadingSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-secondary/50 ${className}`} />
);

export const CardSkeleton = () => (
  <div className="glass-card p-6 space-y-4">
    <LoadingSkeleton className="h-4 w-1/3" />
    <LoadingSkeleton className="h-8 w-1/2" />
    <LoadingSkeleton className="h-3 w-2/3" />
  </div>
);

export const ChartSkeleton = () => (
  <div className="glass-card p-6 space-y-4">
    <LoadingSkeleton className="h-4 w-1/4" />
    <LoadingSkeleton className="h-48 w-full" />
  </div>
);

export const TableSkeleton = () => (
  <div className="glass-card p-6 space-y-3">
    <LoadingSkeleton className="h-4 w-1/4" />
    {Array.from({ length: 5 }).map((_, i) => (
      <LoadingSkeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);
