import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface SmartPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const SmartPagination = ({ currentPage, totalPages, onPageChange }: SmartPaginationProps) => {
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages.map((page, index) => {
      if (page === '...') {
        return (
          <div key={`ellipsis-${index}`} className="flex items-center justify-center h-9 w-9">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>
        );
      }

      const pageNum = page as number;
      return (
        <Button
          key={pageNum}
          variant={currentPage === pageNum ? "default" : "outline"}
          size="icon"
          onClick={() => onPageChange(pageNum)}
          className="h-9 w-9"
        >
          {pageNum}
        </Button>
      );
    });
  };

  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-9 w-9 mr-1"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {renderPageNumbers()}
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-9 w-9 ml-1"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
