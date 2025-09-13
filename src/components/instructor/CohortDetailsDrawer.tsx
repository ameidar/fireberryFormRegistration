import React from 'react';
import { formatDate, formatDateTime, isPast } from '@/utils/date';
import { cn } from '@/utils/cn';
import type { CohortDetails, Student } from '@/types';

// UI Components
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Icons
import {
  Users,
  Calendar,
  MapPin,
  Clock,
  FileText,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface CohortDetailsDrawerProps {
  cohort: CohortDetails | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

const statusVariantMap: Record<CohortDetails['status'], 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  active: 'success',
  inactive: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
};

const statusLabelMap: Record<CohortDetails['status'], string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  completed: 'הסתיים',
  cancelled: 'מבוטל',
};

const studentStatusVariantMap: Record<Student['status'], 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
  registered: 'secondary',
  active: 'success',
  completed: 'default',
  dropped: 'destructive',
  pending: 'warning',
};

const studentStatusLabelMap: Record<Student['status'], string> = {
  registered: 'רשום',
  active: 'פעיל',
  completed: 'סיים',
  dropped: 'נשר',
  pending: 'בהמתנה',
};

const getStatusIcon = (status: Student['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'dropped':
    case 'pending':
      return <AlertCircle className="w-4 h-4" />;
    case 'active':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <User className="w-4 h-4" />;
  }
};

export const CohortDetailsDrawer: React.FC<CohortDetailsDrawerProps> = ({
  cohort,
  isOpen,
  onClose,
  isLoading = false,
}) => {
  if (!cohort && !isLoading) return null;

  return (
    <Drawer open={isOpen} onOpenChange={() => onClose()}>
      <DrawerContent side="left" className="h-full w-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-muted-foreground font-hebrew">טוען פרטי קורס...</p>
            </div>
          </div>
        ) : cohort && (
          <div className="p-6 space-y-6" dir="rtl">
            {/* Header */}
            <DrawerHeader className="px-0">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <DrawerTitle className="text-2xl font-bold font-hebrew text-right">
                    {cohort.name}
                  </DrawerTitle>
                  {cohort.description && (
                    <DrawerDescription className="text-base font-hebrew text-right">
                      {cohort.description}
                    </DrawerDescription>
                  )}
                </div>
                <Badge variant={statusVariantMap[cohort.status]} className="font-hebrew">
                  {statusLabelMap[cohort.status]}
                </Badge>
              </div>
            </DrawerHeader>

            {/* Course Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 font-hebrew">
                  <FileText className="w-5 h-5" />
                  <span>פרטי הקורס</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground font-hebrew">תאריך התחלה</p>
                      <p className="font-medium font-hebrew">
                        {formatDateTime(cohort.startDate)}
                      </p>
                    </div>
                  </div>

                  {/* End Date */}
                  {cohort.endDate && (
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground font-hebrew">תאריך סיום</p>
                        <p className={cn(
                          "font-medium font-hebrew",
                          isPast(cohort.endDate) && cohort.status === 'active' && "text-warning"
                        )}>
                          {formatDateTime(cohort.endDate)}
                          {isPast(cohort.endDate) && cohort.status === 'active' && (
                            <span className="text-xs text-warning mr-2">(עבר)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {cohort.location && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground font-hebrew">מיקום</p>
                        <p className="font-medium font-hebrew">{cohort.location}</p>
                      </div>
                    </div>
                  )}

                  {/* Students Count */}
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground font-hebrew">משתתפים</p>
                      <p className="font-medium font-hebrew">
                        {cohort.currentStudents}
                        {cohort.maxStudents && ` מתוך ${cohort.maxStudents}`}
                        {cohort.maxStudents && cohort.currentStudents >= cohort.maxStudents && (
                          <span className="text-warning text-xs mr-2">(מלא)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {cohort.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground font-hebrew mb-2">הערות</p>
                    <p className="text-sm font-hebrew bg-muted/50 p-3 rounded-md">
                      {cohort.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Students List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-hebrew">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>רשימת משתתפים</span>
                  </div>
                  <Badge variant="outline" className="font-hebrew">
                    {cohort.students.length} משתתפים
                  </Badge>
                </CardTitle>
                <CardDescription className="font-hebrew">
                  פרטי המשתתפים רשומים בקורס
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cohort.students.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-hebrew">
                      אין משתתפים רשומים עדיין
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right font-hebrew">שם המשתתף</TableHead>
                          <TableHead className="text-right font-hebrew">סטטוס</TableHead>
                          <TableHead className="text-right font-hebrew">תאריך הרשמה</TableHead>
                          <TableHead className="text-right font-hebrew">פרטי קשר</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cohort.students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(student.status)}
                                <span className="font-hebrew">{student.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={studentStatusVariantMap[student.status]}
                                className="font-hebrew"
                              >
                                {studentStatusLabelMap[student.status]}
                              </Badge>
                              {student.completionDate && (
                                <div className="text-xs text-muted-foreground mt-1 font-hebrew">
                                  סיים: {formatDate(student.completionDate)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-hebrew">
                              {formatDate(student.registrationDate)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-right">
                                {student.email && (
                                  <div className="flex items-center justify-end space-x-1 text-sm">
                                    <span className="font-mono" dir="ltr">{student.email}</span>
                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                  </div>
                                )}
                                {student.phone && (
                                  <div className="flex items-center justify-end space-x-1 text-sm">
                                    <span className="font-mono" dir="ltr">{student.phone}</span>
                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                  </div>
                                )}
                                {!student.email && !student.phone && (
                                  <span className="text-muted-foreground text-sm font-hebrew">
                                    לא זמין
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};