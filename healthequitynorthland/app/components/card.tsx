import { ReactNode } from "react";

interface Props {
  title: string;
  value: ReactNode;
  change?: string;
}

export default function StatCard({ title, value, change }: Props) {
  return (
    <div className="border-3 border-gray-200 p-5 rounded-xl">
      <h3 className="text-base">{title}</h3>
      <div className="text-base font-bold mt-2">{value}</div>

      {change && <div>{change}</div>}
    </div>
  );
}