import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

export type PriorityData = {
  name: string;
  value: number;
};

interface Props {
  data: PriorityData[];
}

const priorityColors: Record<string, string> = {
  High: "#ef4444",
  Medium: "#eab308",
  Low: "#22c55e",
  None: "hsl(var(--primary))",
};

export const PriorityPieChart = ({ data }: Props) => {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            label
          >
            {data.map((item) => (
              <Cell
                key={item.name}
                fill={priorityColors[item.name] || "hsl(var(--muted-foreground))"}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};