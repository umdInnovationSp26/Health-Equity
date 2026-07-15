
import { useEffect, useMemo, useRef } from "react";
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from "chart.js";

type ProduceStat = {
  name: string;
  lbs: number;
};

const PRODUCE_COLORS = [
  "#6050DC",
  "#D52DB7",
  "#FF2E7E",
  "#FF6B45",
  "#FFAB05",
  "#63A3D9",
];
const MAX_SLICES = 5;

function buildChartData(data: ProduceStat[]) {
  const sortedItems = [...data].sort((a, b) => b.lbs - a.lbs);
  const topItems = sortedItems.slice(0, MAX_SLICES);
  const otherLbs = sortedItems
    .slice(MAX_SLICES)
    .reduce((total, item) => total + item.lbs, 0);

  const labels = topItems.map((item) => item.name);
  const values = topItems.map((item) => item.lbs);

  if (otherLbs > 0) {
    labels.push("Other");
    values.push(otherLbs);
  }

  return { labels, values };
}

export default function ProduceChart({ data }: { data: ProduceStat[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const chartData = useMemo(() => buildChartData(data), [data]);

  useEffect(() => {
    if (!canvasRef.current || chartData.labels.length === 0) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            data: chartData.values,
            backgroundColor: chartData.labels.map(
              (_, index) => PRODUCE_COLORS[index % PRODUCE_COLORS.length],
            ),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "50%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} lbs` },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="flex h-[130px] flex-col items-center justify-center gap-1 text-center text-xs text-slate-400">
        <span>No produce data yet.</span>
        <span>
          Add documents to{" "}
          <code className="rounded bg-slate-100 px-1">produceStats</code>.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[130px] w-[130px] flex-shrink-0">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Produce sold this month by item"
        />
      </div>

      <div className="space-y-2">
        {chartData.labels.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: PRODUCE_COLORS[i % PRODUCE_COLORS.length] }}
            />
            <span>
              {label}{" "}
              <span className="font-semibold text-slate-900">
                {chartData.values[i]} lbs
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}