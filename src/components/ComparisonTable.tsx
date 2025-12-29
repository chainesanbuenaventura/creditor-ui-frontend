"use client";

interface ComparisonRow {
  gt_idx: number;
  gt_name: string;
  gt_summe: number;
  ext_name: string | null;
  ext_summe: number;
  status: string;
}

interface ComparisonTableProps {
  groundTruth: Array<Record<string, unknown>>;
  extracted: Array<Record<string, unknown>>;
  comparison: {
    rows: ComparisonRow[];
    extra_rows: Array<Record<string, unknown>>;
  };
}

export default function ComparisonTable({
  groundTruth,
  extracted,
  comparison,
}: ComparisonTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "exact":
        return "bg-green-500/20 border-green-500/50 text-green-400";
      case "close":
        return "bg-lime-500/20 border-lime-500/50 text-lime-400";
      case "name_only":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
      case "amount_only":
        return "bg-orange-500/20 border-orange-500/50 text-orange-400";
      case "missing":
        return "bg-red-500/20 border-red-500/50 text-red-400";
      default:
        return "bg-gray-500/20 border-gray-500/50";
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Ground Truth Table */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
        <h3 className="text-lg font-semibold mb-4 text-green-400">
          Ground Truth ({groundTruth.length} rows)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-2 text-gray-400">#</th>
                <th className="text-left p-2 text-gray-400">Creditor</th>
                <th className="text-right p-2 text-gray-400">Summe</th>
              </tr>
            </thead>
            <tbody>
              {groundTruth.map((gt, idx) => (
                <tr
                  key={idx}
                  className="border-b border-[var(--border)]/50 hover:bg-white/5"
                >
                  <td className="p-2 text-gray-500">{idx + 1}</td>
                  <td className="p-2 font-medium">
                    {String(gt.creditor_name || "Unknown")}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {formatCurrency(Number(gt.summe) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extracted Table */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
        <h3 className="text-lg font-semibold mb-4 text-accent-400">
          Extracted ({extracted.length} rows)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-2 text-gray-400">#</th>
                <th className="text-left p-2 text-gray-400">Creditor</th>
                <th className="text-right p-2 text-gray-400">Summe</th>
                <th className="text-left p-2 text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr
                  key={row.gt_idx}
                  className={`border-b border-[var(--border)]/50 hover:bg-white/5 ${getStatusColor(row.status)}`}
                >
                  <td className="p-2 text-gray-500">{row.gt_idx}</td>
                  <td className="p-2 font-medium">
                    {row.ext_name || (
                      <span className="text-gray-500 italic">Missing</span>
                    )}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {row.ext_summe > 0 ? formatCurrency(row.ext_summe) : "—"}
                  </td>
                  <td className="p-2 text-xs uppercase">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Extra rows */}
        {comparison.extra_rows.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <h4 className="text-sm font-semibold text-purple-400 mb-2">
              Extra Rows ({comparison.extra_rows.length})
            </h4>
            <div className="space-y-1">
              {comparison.extra_rows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-purple-900/20 rounded border border-purple-900/30 text-xs"
                >
                  <span>{String(row.creditor_name) || "Unknown"}</span>
                  <span className="font-mono">
                    {formatCurrency(Number(row.summe) || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

