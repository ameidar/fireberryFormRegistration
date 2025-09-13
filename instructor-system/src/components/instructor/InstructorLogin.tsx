import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, User, IdCard, Loader2, GraduationCap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { instructorService } from '@/services/fireberry-api';
import { loginFormSchema, type LoginFormData } from '@/lib/validations';
import { validateIsraeliId, formatIsraeliId, cleanIsraeliId } from '@/utils/validation';
import type { Instructor, LoginResponse } from '@/types/instructor';

interface InstructorLoginProps {
  onLoginSuccess: (instructor: Instructor, token: string) => void;
  onLoginError: (message: string) => void;
}

export const InstructorLogin: React.FC<InstructorLoginProps> = ({
  onLoginSuccess,
  onLoginError,
}) => {
  const [showIdNumber, setShowIdNumber] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      instructorName: '',
      idNumber: ''
    }
  });

  // Fetch instructors for autocomplete
  const { data: instructors = [], isLoading: isLoadingInstructors } = useQuery({
    queryKey: ['instructors'],
    queryFn: instructorService.fetchInstructors,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  const selectedName = watch('instructorName');
  const idNumber = watch('idNumber');

  // Auto-format ID number as user types
  useEffect(() => {
    if (idNumber) {
      const cleanId = cleanIsraeliId(idNumber);
      if (cleanId !== idNumber) {
        setValue('idNumber', cleanId);
      }
    }
  }, [idNumber, setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLogging(true);
    try {
      const response: LoginResponse = await instructorService.loginInstructor(
        data.instructorName,
        data.idNumber
      );

      if (response.success && response.instructor && response.token) {
        onLoginSuccess(response.instructor, response.token);
      } else {
        onLoginError(response.message || 'שגיאה בהתחברות');
      }
    } catch (error) {
      onLoginError('שגיאה בהתחברות לשרת. אנא נסה שוב.');
      console.error('Login error:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const formatIdForDisplay = (value: string) => {
    const clean = cleanIsraeliId(value);
    return formatIsraeliId(clean);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            כניסת מדריכים
          </h1>
          <p className="text-gray-600">
            התחבר כדי לגשת לניהול המפגשים שלך
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Instructor Name Selection */}
            <div className="space-y-2">
              <Label htmlFor="instructorName" className="text-right block">
                <User className="inline w-4 h-4 ml-1" />
                שם המדריך *
              </Label>

              <Select
                value={selectedName}
                onValueChange={(value) => setValue('instructorName', value)}
                disabled={isLoadingInstructors}
              >
                <SelectTrigger className="text-right" dir="rtl">
                  <SelectValue placeholder={
                    isLoadingInstructors ? "טוען רשימת מדריכים..." : "בחר מדריך מהרשימה"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((instructor) => (
                    <SelectItem
                      key={instructor.id}
                      value={instructor.name}
                      className="text-right"
                      dir="rtl"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{instructor.name}</span>
                        {instructor.specialization && (
                          <span className="text-sm text-gray-500 mr-2">
                            {instructor.specialization}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.instructorName && (
                <p className="text-red-500 text-sm text-right">
                  {errors.instructorName.message}
                </p>
              )}
            </div>

            {/* ID Number Input */}
            <div className="space-y-2">
              <Label htmlFor="idNumber" className="text-right block">
                <IdCard className="inline w-4 h-4 ml-1" />
                מספר זהות *
              </Label>

              <div className="relative">
                <Input
                  type={showIdNumber ? "text" : "password"}
                  dir="ltr"
                  className="pl-10 pr-4 text-left font-mono"
                  placeholder="123456789"
                  maxLength={9}
                  {...register('idNumber')}
                  onChange={(e) => {
                    const value = cleanIsraeliId(e.target.value);
                    setValue('idNumber', value);
                  }}
                />

                <button
                  type="button"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowIdNumber(!showIdNumber)}
                  tabIndex={-1}
                >
                  {showIdNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* ID Number Validation Display */}
              {idNumber && (
                <div className="text-sm text-left" dir="ltr">
                  <span className="font-mono text-gray-600">
                    {formatIdForDisplay(idNumber)}
                  </span>
                  {idNumber.length >= 8 && (
                    <span className={`mr-2 ${validateIsraeliId(idNumber) ? 'text-green-600' : 'text-red-500'}`}>
                      {validateIsraeliId(idNumber) ? '✓ תקין' : '✗ לא תקין'}
                    </span>
                  )}
                </div>
              )}

              {errors.idNumber && (
                <p className="text-red-500 text-sm text-right">
                  {errors.idNumber.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={isLogging || isLoadingInstructors}
            >
              {isLogging ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  מתחבר...
                </>
              ) : (
                <>
                  <User className="w-5 h-5 ml-2" />
                  התחבר
                </>
              )}
            </Button>
          </form>

          {/* Development Helper */}
          {import.meta.env.VITE_USE_MOCK_DATA === 'true' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm font-medium mb-2">
                מצב פיתוח - נתונים לדוגמה:
              </p>
              <div className="text-yellow-700 text-xs space-y-1">
                <div>• דוד כהן - 123456789</div>
                <div>• שרה לוי - 987654321</div>
                <div>• מיכל אברהם - 555444333</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2024 מערכת ניהול מדריכים</p>
        </div>
      </div>
    </div>
  );
};