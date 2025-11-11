import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: 'UP' | 'DOWN' | 'PENDING';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (status === 'UP') {
    return (
      <Badge 
        variant="outline" 
        className={`bg-status-up-bg dark:bg-status-up-bg-dark text-status-up border-status-up/20 gap-1 ${className || ''}`}
        data-testid={`badge-status-up`}
      >
        <CheckCircle2 className="h-3 w-3" />
        UP
      </Badge>
    );
  }
  
  if (status === 'DOWN') {
    return (
      <Badge 
        variant="outline" 
        className={`bg-status-down-bg dark:bg-status-down-bg-dark text-status-down border-status-down/20 gap-1 ${className || ''}`}
        data-testid={`badge-status-down`}
      >
        <XCircle className="h-3 w-3" />
        DOWN
      </Badge>
    );
  }
  
  return (
    <Badge 
      variant="outline" 
      className={`bg-status-pending-bg dark:bg-status-pending-bg-dark text-status-pending border-status-pending/20 gap-1 ${className || ''}`}
      data-testid={`badge-status-pending`}
    >
      <Clock className="h-3 w-3" />
      PENDING
    </Badge>
  );
}
