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
  "Awaiting Approval": "#f97316",
  Open: "#3b82f6",
  "In Progress": "#eab308",
  Completed: "#22c55e",
  Overdue: "#ef4444",
};

export const JobsByStatusChart = ({ data }: Props) => {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="status"
            interval={0}
            height={40}
            tick={{ fontSize: 11 }}
          />

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