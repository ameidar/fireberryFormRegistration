import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCohorts, useCohortDetails } from '@/hooks/useCohorts';
import { CohortsTable } from './CohortsTable';
import { CohortDetailsDrawer } from './CohortDetailsDrawer';
import { cn } from '@/utils/cn';
import type { Cohort, CohortFilters, CohortSort } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// Icons
import {
  LogOut,
  RefreshCw,
  User,
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface InstructorSessionsPageProps {
  className?: string;
}

const ITEMS_PER_PAGE = 10;

export const InstructorSessionsPage: React.FC<InstructorSessionsPageProps> = ({
  className,
}) => {
  const { instructor, logout, isSessionAboutToExpire, refreshSession } = useAuth();
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filters and pagination
  const [filters, setFilters] = useState<CohortFilters>({ status: 'all', search: '' });
  const [sort, setSort] = useState<CohortSort>({ field: 'startDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch cohorts data
  const {
    data: cohortsData,
    isLoading: cohortsLoading,
    error: cohortsError,
    refetch: refetchCohorts,
  } = useCohorts(
    instructor?.id || '',
    filters,
    sort,
    currentPage,
    ITEMS_PER_PAGE
  );

  // Fetch cohort details when selected
  const {
    data: cohortDetails,
    isLoading: cohortDetailsLoading,
    refetch: refetchCohortDetails,
  } = useCohortDetails(selectedCohort?.id || '');

  // Session expiry warning
  useEffect(() => {
    if (isSessionAboutToExpire) {
      // This would typically be handled by a toast or notification
      console.warn('Session is about to expire');
    }
  }, [isSessionAboutToExpire]);

  // Handle cohort click
  const handleCohortClick = useCallback((cohort: Cohort) => {
    setSelectedCohort(cohort);
    setIsDrawerOpen(true);
  }, []);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedCohort(null);
  }, []);

  // Handle filter changes
  const handleStatusFilterChange = useCallback((status: CohortFilters['status']) => {
    setFilters(prev => ({ ...prev, status }));
    setCurrentPage(1); // Reset to first page
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setCurrentPage(1); // Reset to first page
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((newSort: CohortSort) => {
    setSort(newSort);
    setCurrentPage(1); // Reset to first page
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchCohorts();
    if (selectedCohort) {
      refetchCohortDetails();
    }
  }, [refetchCohorts, refetchCohortDetails, selectedCohort]);

  // Get status counts for badges
  const getStatusCounts = () => {
    if (!cohortsData) return {};

    // Note: These counts would ideally come from the API
    // For now, we'll calculate from current page data
    const counts = cohortsData.data.reduce((acc, cohort) => {
      acc[cohort.status] = (acc[cohort.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return counts;
  };

  const statusCounts = getStatusCounts();

  if (!instructor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-hebrew">לא נמצא מדריך מחובר</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('container mx-auto px-4 py-6 space-y-6', className)} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-hebrew">הקורסים שלי</h1>
          <p className="text-muted-foreground font-hebrew">
            ברוכ/ה הבא/ה {instructor.name}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isSessionAboutToExpire && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSession}
              className="font-hebrew text-warning border-warning hover:bg-warning/10"
            >
              <RefreshCw className="w-4 h-4" />
              הארך התחברות
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={cohortsLoading}
            className="font-hebrew"
          >
            <RefreshCw className={cn("w-4 h-4", cohortsLoading && "animate-spin")} />
            רענן
          </Button>
          <Button variant="ghost" onClick={logout} className="font-hebrew">
            <LogOut className="w-4 h-4" />
            התנתק
          </Button>
        </div>
      </div>

      {/* Instructor Info Card */}
      <Card className="bg-gradient-to-l from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-hebrew">
            <User className="w-5 h-5" />
            <span>פרטי המדריך</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-hebrew">שם מלא</p>
              <p className="font-medium font-hebrew">{instructor.name}</p>
            </div>
            {instructor.specialization && (
              <div>
                <p className="text-sm text-muted-foreground font-hebrew">התמחות</p>
                <p className="font-medium font-hebrew">{instructor.specialization}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground font-hebrew">סה\"כ קורסים</p>
              <p className="font-medium font-hebrew">{cohortsData?.total || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-hebrew">סינון וחיפוש</CardTitle>
              <CardDescription className="font-hebrew">
                סנן וחפש את הקורסים שלך
              </CardDescription>
            </div>

            {/* Status badges */}
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="font-hebrew">
                פעיל: {statusCounts.active || 0}
              </Badge>
              <Badge variant="secondary" className="font-hebrew">
                הסתיים: {statusCounts.completed || 0}
              </Badge>
              <Badge variant="outline" className="font-hebrew">
                סה\"כ: {cohortsData?.total || 0}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium font-hebrew">סטטוס</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-[160px] font-hebrew">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="inactive">לא פעיל</SelectItem>
                  <SelectItem value="completed">הסתיים</SelectItem>
                  <SelectItem value="cancelled">מבוטל</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium font-hebrew">חיפוש</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חפש לפי שם קורס, תיאור או מיקום..."
                  value={filters.search || ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pr-10 font-hebrew"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cohorts Table */}
      {cohortsError ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <div>
                <p className="font-medium font-hebrew">שגיאה בטעינת הקורסים</p>
                <p className="text-sm text-muted-foreground font-hebrew mt-1">
                  {cohortsError.message}
                </p>
              </div>
              <Button onClick={handleRefresh} variant="outline" className="font-hebrew">
                <RefreshCw className="w-4 h-4" />
                נסה שוב
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CohortsTable
          cohorts={cohortsData?.data || []}
          isLoading={cohortsLoading}
          onCohortClick={handleCohortClick}
          onSortChange={handleSortChange}
          searchValue={filters.search || ''}
          onSearchChange={handleSearchChange}
        />
      )}

      {/* Pagination */}
      {cohortsData && cohortsData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-hebrew">
            מציג {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, cohortsData.total)} מתוך {cohortsData.total} קורסים
          </p>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="font-hebrew"
            >
              <ChevronRight className="w-4 h-4" />
              הקודם
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, cohortsData.totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
              {cohortsData.totalPages > 5 && (
                <span className="text-muted-foreground px-2">...</span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= cohortsData.totalPages}
              className="font-hebrew"
            >
              הבא
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cohort Details Drawer */}
      <CohortDetailsDrawer
        cohort={cohortDetails || null}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        isLoading={cohortDetailsLoading}
      />
    </div>
  );
};