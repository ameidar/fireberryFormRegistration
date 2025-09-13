import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { useInstructors } from '@/hooks/useInstructors';
import { instructorLoginSchema, type InstructorLoginForm } from '@/lib/validations';
import { cn } from '@/utils/cn';
import { formatIsraeliId } from '@/utils/israeli-id';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons
import { LogIn, Loader2, UserCheck, Shield, AlertCircle } from 'lucide-react';

interface InstructorLoginProps {
  onLoginSuccess?: () => void;
  className?: string;
}

export const InstructorLogin: React.FC<InstructorLoginProps> = ({
  onLoginSuccess,
  className,
}) => {
  const { login, isLoading: authLoading } = useAuth();
  const { data: instructors, isLoading: instructorsLoading, error: instructorsError } = useInstructors();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<InstructorLoginForm>({
    resolver: zodResolver(instructorLoginSchema),
    mode: 'onChange',
  });

  const watchedName = watch('name');

  const onSubmit = async (data: InstructorLoginForm) => {
    setIsSubmitting(true);
    try {
      const result = await login(data.name, data.idNumber);
      if (result.success) {
        reset();
        onLoginSuccess?.();
      }
    } catch (error) {
      console.error('Login submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameSelect = (selectedName: string) => {
    setValue('name', selectedName);
  };

  const handleIdNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formattedId = formatIsraeliId(event.target.value);
    setValue('idNumber', formattedId);
  };

  const isLoadingState = authLoading || isSubmitting;

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-right font-hebrew">
            כניסת מדריכים
          </CardTitle>
          <CardDescription className="text-right font-hebrew">
            הזן/י את פרטיך להתחברות למערכת
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
            {/* Instructor Name Selection */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-right font-hebrew">
                שם המדריך/ה
              </Label>
              {instructorsLoading ? (
                <div className="flex items-center justify-center h-10 border rounded-md">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="mr-2 text-sm text-muted-foreground font-hebrew">
                    טוען רשימת מדריכים...
                  </span>
                </div>
              ) : instructorsError ? (
                <div className="flex items-center p-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="w-4 h-4 ml-2" />
                  <span className="font-hebrew">שגיאה בטעינת רשימת המדריכים</span>
                </div>
              ) : (
                <Select value={watchedName || ''} onValueChange={handleNameSelect}>
                  <SelectTrigger className={cn(
                    "w-full text-right font-hebrew",
                    errors.name && "border-destructive"
                  )}>
                    <SelectValue placeholder="בחר/י שם מדריך/ה" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors?.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.name}>
                        <div className="text-right font-hebrew">
                          {instructor.name}
                          {instructor.specialization && (
                            <span className="text-sm text-muted-foreground mr-2">
                              ({instructor.specialization})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.name && (
                <p className="text-sm text-destructive text-right font-hebrew">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* ID Number Input */}
            <div className="space-y-2">
              <Label htmlFor="idNumber" className="text-right font-hebrew">
                מספר זהות
              </Label>
              <Input
                {...register('idNumber')}
                type="text"
                placeholder="123456789"
                className={cn(
                  "text-right font-mono",
                  errors.idNumber && "border-destructive"
                )}
                onChange={handleIdNumberChange}
                maxLength={9}
                dir="ltr"
              />
              {errors.idNumber && (
                <p className="text-sm text-destructive text-right font-hebrew">
                  {errors.idNumber.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground text-right font-hebrew">
                הזן/י מספר זהות בן 8-9 ספרות
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full font-hebrew"
              disabled={!isValid || isLoadingState}
              size="lg"
            >
              {isLoadingState ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  מתחבר...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 ml-2" />
                  התחבר/י
                </>
              )}
            </Button>
          </form>

          {/* Security Note */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-start space-x-2 text-xs text-muted-foreground" dir="rtl">
              <UserCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-right font-hebrew">
                הכניסה מאובטחת ומוגבלת למדריכים רשומים בלבד.
                פרטי ההתחברות נשמרים בצורה מוצפנת ובטוחה.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};