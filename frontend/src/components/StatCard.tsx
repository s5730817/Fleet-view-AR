import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  iconClassName?: string;
}

export const StatCard = ({
  title,
  value,
  description,
  icon,
  iconClassName = "bg-primary/10 text-primary",
}: StatCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>

            {description && (
              <p className="mt-2 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {icon && (
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
            >
              {icon}
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
};