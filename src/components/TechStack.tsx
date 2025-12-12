import type { StackInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Layers3 } from "lucide-react";

export function TechStack({ stack }: { stack: StackInfo[] }) {

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Technology Stack</CardTitle>
        <Layers3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {stack.length > 0 ? (
          <ul className="space-y-3 pt-4">
            {stack.map((tech) => (
              <li key={tech.name} className="flex items-center gap-3">
                {tech.logo && (
                  <img src={tech.logo} alt={`${tech.name} logo`} className="h-6 w-6 object-contain" />
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{tech.name}</span>
                  <span className="text-xs text-muted-foreground">{tech.category}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground pt-4">
            Could not determine technology stack. The repository might be empty or the language not supported.
          </p>
        )}
      </CardContent>
    </Card>
  );
}