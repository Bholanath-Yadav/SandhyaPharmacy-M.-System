import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Ban } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import pharmacyLogo from '@/assets/pharmacy-logo.png';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isBanned, setIsBanned] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
          if (err.path[0] === 'password') fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsBanned(false);

    setLoading(true);
    const { error } = await signIn(email, password);
    
    if (!error) {
      // Check if user is banned after successful auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_banned')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile?.is_banned) {
          await supabase.auth.signOut();
          setLoading(false);
          setIsBanned(true);
          toast({
            title: 'Account Banned',
            description: 'Your account has been banned. Please contact the administrator.',
            variant: 'destructive',
          });
          return;
        }
      }
    }
    
    setLoading(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'Account Exists',
          description: 'This email is already registered. Please sign in instead.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Registration Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Account Created!',
        description: 'You can now sign in with your credentials.',
      });
      navigate('/');
    }
  };

  return (
    <div 
      className="min-h-screen min-h-[100dvh] bg-gradient-hero flex items-center justify-center p-3 sm:p-4 md:p-6"
      style={{ 
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)'
      }}
    >
      <div className="w-full max-w-[calc(100%-1rem)] sm:max-w-md animate-scale-in">
        {/* Logo Section */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm mb-3 sm:mb-4 p-1.5 sm:p-2">
            <img src={pharmacyLogo} alt="Sandhya Pharmacy Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground">Sandhya Pharmacy</h1>
          <p className="text-primary-foreground/70 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">Pharmacy Management System</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2 sm:pb-4 px-4 sm:px-6">
            <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              <CardTitle className="text-base sm:text-lg md:text-xl">Admin Access</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Sign in to manage your pharmacy operations
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-9 sm:h-10">
                <TabsTrigger value="signin" className="text-xs sm:text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs sm:text-sm">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signin-email" className="text-xs sm:text-sm">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@sandhyapharmacy.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(
                        "h-10 sm:h-11 text-sm sm:text-base",
                        errors.email ? 'border-destructive' : ''
                      )}
                    />
                    {errors.email && (
                      <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signin-password" className="text-xs sm:text-sm">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(
                        "h-10 sm:h-11 text-sm sm:text-base",
                        errors.password ? 'border-destructive' : ''
                      )}
                    />
                    {errors.password && (
                      <p className="text-xs sm:text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base mt-2" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-email" className="text-xs sm:text-sm">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@sandhyapharmacy.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(
                        "h-10 sm:h-11 text-sm sm:text-base",
                        errors.email ? 'border-destructive' : ''
                      )}
                    />
                    {errors.email && (
                      <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-password" className="text-xs sm:text-sm">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(
                        "h-10 sm:h-11 text-sm sm:text-base",
                        errors.password ? 'border-destructive' : ''
                      )}
                    />
                    {errors.password && (
                      <p className="text-xs sm:text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base mt-2" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Admin Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          {/* Banned User Warning */}
          {isBanned && (
            <div className="mx-3 sm:mx-6 mb-4 sm:mb-6 p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive font-medium mb-1 text-sm sm:text-base">
                <Ban className="h-4 w-4 flex-shrink-0" />
                Account Banned
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Your account has been banned by the administrator. If you believe this is an error, please contact support.
              </p>
            </div>
          )}
        </Card>

        <p className="text-center text-primary-foreground/50 text-[10px] sm:text-xs md:text-sm mt-4 sm:mt-6">
          © 2024 Sandhya Pharmacy. All rights reserved.
        </p>
      </div>
    </div>
  );
}
