import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

export type FleetConditionData = {
  name: string;
  value: number;
};

interface Props {
  data: FleetConditionData[];
}

const fleetColors: Record<string, string> = {
  Good: "#22c55e",
  "Requires Attention": "#eab308",
  "Out Of Operation": "#ef4444",
};

export const FleetConditionChart = ({ data }: Props) => {
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
          >
            {data.map((item) => (
              <Cell
                key={item.name}
                fill={
                  fleetColors[item.name] ||
                  "hsl(var(--muted-foreground))"
                }
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