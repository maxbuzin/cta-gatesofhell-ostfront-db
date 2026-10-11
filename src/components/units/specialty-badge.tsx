import { Badge } from "@/components/ui/badge";

export function SpecialtyBadge({ name }: { name: string }) {
  return (
    <Badge variant="outline" className="font-normal">
      {name}
    </Badge>
  );
}
