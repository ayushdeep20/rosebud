// components/shared/AdminCard.tsx
export function AdminCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 max-w-xl ${className}`}>
      <h2 className="text-lg font-medium mb-4">{title}</h2>
      {children}
    </div>
  );
}