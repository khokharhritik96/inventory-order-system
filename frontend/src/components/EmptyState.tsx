interface Props {
  title: string;
  message: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, message, action }: Props) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
