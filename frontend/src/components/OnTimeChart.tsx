import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

export type OnTimeOverdueData = {
  name: string;
  value: number;
};

interface Props {
  data: OnTimeOverdueData[];
}

const statusColors: Record<string, string> = {
  "On Time": "#22c55e",
  Overdue: "#ef4444",
};

export const OnTimeOverdueChart = ({ data }: Props) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const onTime = data.find((item) => item.name === "On Time")?.value || 0;
  const percentage = total > 0 ? Math.round((onTime / total) * 100) : 0;

  return (
    <div className="relative h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={95}
            startAngle={90}
            endAngle={-270}
            paddingAngle={3}
          >
            {data.map((item) => (
              <Cell
                key={item.name}
                fill={statusColors[item.name] || "hsl(var(--muted-foreground))"}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-3xl font-bold">{percentage}%</p>
          <p className="text-xs text-muted-foreground">On Time</p>
        </div>
      </div>
    </div>
  );
};