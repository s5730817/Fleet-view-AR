import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export type CreatedCompletedData = {
  date: string;
  created: number;
  completed: number;
};

interface Props {
  data: CreatedCompletedData[];
}

export const CreatedCompletedChart = ({ data }: Props) => {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={3} />
          <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};