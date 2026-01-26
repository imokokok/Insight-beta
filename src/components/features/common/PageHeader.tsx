interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="relative z-10 mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="relative">
        <h1 className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-base leading-relaxed text-gray-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">{children}</div>
    </div>
  );
}
