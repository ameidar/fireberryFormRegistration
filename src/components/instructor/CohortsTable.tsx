import React, { useState, useMemo } from 'react';
import { formatDate, formatRelativeTime } from '@/utils/date';
import { cn } from '@/utils/cn';
import type { Cohort, CohortSort } from '@/types';

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Icons
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Calendar,
  MapPin,
  Eye,
  Filter,
} from 'lucide-react';

interface CohortsTableProps {
  cohorts: Cohort[];
  isLoading?: boolean;
  onCohortClick?: (cohort: Cohort) => void;
  onSortChange?: (sort: CohortSort) => void;
  searchValue?: string;
  onSearchChange?: (search: string) => void;
  className?: string;
}

const statusVariantMap: Record<Cohort['status'], 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  active: 'success',
  inactive: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
};

const statusLabelMap: Record<Cohort['status'], string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  completed: 'הסתיים',
  cancelled: 'מבוטל',
};

export const CohortsTable: React.FC<CohortsTableProps> = ({
  cohorts,
  isLoading = false,
  onCohortClick,
  onSortChange,
  searchValue = '',
  onSearchChange,
  className,
}) => {
  const [sort, setSort] = useState<CohortSort>({ field: 'startDate', direction: 'desc' });

  // Handle sorting
  const handleSort = (field: keyof Cohort) => {
    const newSort: CohortSort = {
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc',
    };
    setSort(newSort);
    onSortChange?.(newSort);
  };

  // Get sort icon for column
  const getSortIcon = (field: keyof Cohort) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sort.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  // Filtered and highlighted cohorts
  const processedCohorts = useMemo(() => {
    if (!searchValue) return cohorts;

    const searchLower = searchValue.toLowerCase();
    return cohorts.filter(cohort =>
      cohort.name.toLowerCase().includes(searchLower) ||
      (cohort.description && cohort.description.toLowerCase().includes(searchLower)) ||
      (cohort.location && cohort.location.toLowerCase().includes(searchLower))
    );
  }, [cohorts, searchValue]);

  // Highlight search terms in text
  const highlightText = (text: string, search: string): React.ReactNode => {
    if (!search.trim()) return text;

    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-10 w-64 bg-muted rounded-md animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="border rounded-lg overflow-hidden">
          <div className="h-12 bg-muted animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 border-t bg-background animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      <div className="flex justify-between items-center gap-4" dir="rtl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חפש לפי שם קורס, תיאור או מיקום..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pr-10 text-right font-hebrew"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-hebrew">
            {processedCohorts.length} מתוך {cohorts.length} קורסים
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right font-hebrew">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  שם הקורס
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead className="text-right font-hebrew">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  סטטוס
                  {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead className="text-right font-hebrew">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('startDate')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  תאריך התחלה
                  {getSortIcon('startDate')}
                </Button>
              </TableHead>
              <TableHead className="text-right font-hebrew">משתתפים</TableHead>
              <TableHead className="text-right font-hebrew">מיקום</TableHead>
              <TableHead className="text-center font-hebrew">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedCohorts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <Search className="w-8 h-8 text-muted-foreground" />
                    <p className="text-muted-foreground font-hebrew">
                      {searchValue ? 'לא נמצאו קורסים התואמים את החיפוש' : 'לא נמצאו קורסים'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              processedCohorts.map((cohort) => (
                <TableRow
                  key={cohort.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onCohortClick?.(cohort)}
                >
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="font-hebrew text-right">
                        {highlightText(cohort.name, searchValue)}
                      </div>
                      {cohort.description && (
                        <div className="text-sm text-muted-foreground font-hebrew text-right line-clamp-2">
                          {highlightText(cohort.description, searchValue)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[cohort.status]} className="font-hebrew">
                      {statusLabelMap[cohort.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-end space-x-1 font-hebrew">
                        <span>{formatDate(cohort.startDate)}</span>
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground font-hebrew">
                        {formatRelativeTime(cohort.startDate)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end space-x-1">
                      <span className="font-medium font-hebrew">
                        {cohort.currentStudents}
                        {cohort.maxStudents && `/${cohort.maxStudents}`}
                      </span>
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {cohort.location ? (
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-sm font-hebrew">
                          {highlightText(cohort.location, searchValue)}
                        </span>
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-hebrew">לא צוין</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCohortClick?.(cohort);
                      }}
                      className="font-hebrew"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};