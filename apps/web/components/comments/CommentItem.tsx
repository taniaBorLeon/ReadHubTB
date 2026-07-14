import { memo } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CommentWithAuthor } from "@readhub/types/comment";

const dateFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(dateString: string): string {
  return dateFormatter.format(new Date(dateString));
}

export const CommentItem = memo(function CommentItem({
  comment,
}: {
  comment: CommentWithAuthor;
}) {
  const initials = comment.author_email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <div className="flex gap-3">
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-foreground">
            {comment.author_email}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-foreground">{comment.comment}</p>
      </div>
    </div>
  );
});
