export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="max-w-2xl space-y-4 rounded-lg bg-white p-10 shadow-soft">
      <div className="h-6 w-1/2 rounded-sm bg-cream-50" />
      <div className="h-4 w-3/4 rounded-sm bg-cream-50" />
      <div className="h-4 w-2/3 rounded-sm bg-cream-50" />
    </div>
  );
}
