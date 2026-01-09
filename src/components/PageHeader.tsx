interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-10 relative z-10">
      <div className="relative">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600">
          {title}
        </h1>
        {description && (
          <p className="text-base text-gray-500 mt-2 max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">{children}</div>
    </div>
  );
}
