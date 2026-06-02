import { ReactNode } from "react";

interface Props {
  title: string;
  action?: ReactNode;
}

export default function PageHeader({ title, action }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
