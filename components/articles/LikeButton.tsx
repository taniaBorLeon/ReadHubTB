import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LikeButton({
  liked,
  count,
  loading,
  error,
  onToggle,
}: {
  liked: boolean;
  count: number;
  loading?: boolean;
  error?: string | null;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={liked ? "default" : "outline"}
        onClick={onToggle}
        disabled={loading}
        className={cn(
          liked &&
            "border-transparent bg-like text-like-foreground hover:bg-like/90",
        )}
      >
        <Heart className={cn("size-4", liked && "fill-current")} />
        {liked ? "Te gusta" : "Me gusta"} · {count}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
