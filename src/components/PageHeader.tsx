interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-purple-950 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-purple-900/60 mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
