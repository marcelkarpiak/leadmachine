interface ScoreDistributionProps {
  hotCount: number;
  warmCount: number;
  coldCount: number;
}

export default function ScoreDistribution({ hotCount, warmCount, coldCount }: ScoreDistributionProps) {
  const total = hotCount + warmCount + coldCount;

  if (total === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-[13px] text-text-secondary">Brak leadów do wyświetlenia rozkładu.</p>
      </div>
    );
  }

  const hotPct = Math.round((hotCount / total) * 100);
  const warmPct = Math.round((warmCount / total) * 100);
  const coldPct = 100 - hotPct - warmPct;

  return (
    <div className="px-6 py-5">
      {/* Bar */}
      <div className="flex h-4 rounded-full overflow-hidden bg-bg-surface-2">
        {hotPct > 0 && (
          <div
            className="bg-success transition-all duration-500"
            style={{ width: `${hotPct}%` }}
          />
        )}
        {warmPct > 0 && (
          <div
            className="bg-warning transition-all duration-500"
            style={{ width: `${warmPct}%` }}
          />
        )}
        {coldPct > 0 && (
          <div
            className="bg-border transition-all duration-500"
            style={{ width: `${coldPct}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-[13px] text-text-secondary">
            Hot <span className="font-medium text-text-primary">{hotCount}</span>{" "}
            <span className="text-text-tertiary">({hotPct}%)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-[13px] text-text-secondary">
            Warm <span className="font-medium text-text-primary">{warmCount}</span>{" "}
            <span className="text-text-tertiary">({warmPct}%)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-border" />
          <span className="text-[13px] text-text-secondary">
            Cold <span className="font-medium text-text-primary">{coldCount}</span>{" "}
            <span className="text-text-tertiary">({coldPct}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
