import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';
import { resetPasswordSchema, ResetPasswordFormData } from '@/lib/validations';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ResetPassword() {
  const [submitted, setSubmitted] = useState(false);
  const { resetPassword, loading } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    const { error } = await resetPassword(data.email);
    
    if (error) {
      toast({
        title: 'Errore',
        description: error,
        variant: 'destructive',
      });
    } else {
      setSubmitted(true);
      toast({
        title: 'Email inviata!',
        description: 'Controlla la tua email per le istruzioni di reset.',
      });
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary rounded-lg flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Email inviata</CardTitle>
            <CardDescription>
              Controlla la tua casella email per le istruzioni di reset della password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Non hai ricevuto l'email? Controlla la cartella spam o 
                <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setSubmitted(false)}>
                  riprova
                </Button>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna al login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-lg">LT</span>
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Inserisci la tua email per ricevere le istruzioni di reset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Inserisci la tua email"
                {...register('email')}
                aria-invalid={errors.email ? 'true' : 'false'}
              />
              {errors.email && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Invio in corso...' : 'Invia email di reset'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              <ArrowLeft className="h-4 w-4 inline mr-1" />
              Torna al login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}