import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export type JobsByStatusData = {
  status: string;
  value: number;
};

interface Props {
  data: JobsByStatusData[];
}

const statusColors: Record<string, string> = {
  Open: "hsl(var(--primary))",
  "In Progress": "#eab308",
  Completed: "#22c55e",
  Overdue: "#ef4444",
};

export const JobsByStatusChart = ({ data }: Props) => {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((item) => (
              <Cell
                key={item.status}
                fill={statusColors[item.status] || "hsl(var(--primary))"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};