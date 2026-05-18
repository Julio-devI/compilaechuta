export function CategoriaTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr
          key={`skeleton-${index}`}
          className="bg-card animate-pulse border-b border-border"
        >
          <td className="py-4 pl-4 pr-2 rounded-l-2xl border-0">
            <div className="h-4 w-4 rounded bg-slate-200" />
          </td>
          <td className="py-4 px-6 border-0">
            <div className="h-4 w-24 rounded-full bg-slate-200" />
          </td>
          <td className="py-4 px-6 border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-200 flex-shrink-0" />
              <div className="h-4 w-32 rounded-full bg-slate-200" />
            </div>
          </td>
          <td className="py-4 px-6 border-0">
            <div className="h-4 w-16 rounded-full bg-slate-200 mx-auto" />
          </td>
          <td className="py-4 px-6 border-0">
            <div className="h-4 w-16 rounded-full bg-slate-200 mx-auto" />
          </td>
          <td className="py-4 px-6 border-0">
            <div className="h-4 w-24 rounded-full bg-slate-200" />
          </td>
          <td className="py-4 px-6 border-0">
            <div className="h-4 w-20 rounded-full bg-slate-200 mx-auto" />
          </td>
          <td className="py-4 px-6 rounded-r-2xl border-0">
            <div className="h-4 w-14 rounded-full bg-slate-200 mx-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}