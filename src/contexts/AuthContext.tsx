import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'main_admin' | 'admin' | 'staff' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isMainAdmin: boolean;
  userRole: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);

  const logAuthEvent = async (action: string, userId: string | null, details?: Record<string, unknown>) => {
    try {
      await supabase.from('audit_logs').insert({
        action,
        table_name: 'auth',
        user_id: userId,
        new_values: {
          ...details,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          platform: navigator.platform,
        },
      });
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Log auth events
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            logAuthEvent('LOGIN', session.user.id, { 
              email: session.user.email,
              provider: session.user.app_metadata?.provider || 'email',
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          // Note: user_id will be null here since user is signed out
          setTimeout(() => {
            logAuthEvent('LOGOUT', null, { event: 'user_signed_out' });
          }, 0);
        }
        
        // Check user role after auth state changes
        if (session?.user) {
          setTimeout(() => {
            checkUserRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsStaff(false);
          setIsMainAdmin(false);
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      // First check if user is banned
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', userId)
        .maybeSingle();

      if (profileData?.is_banned) {
        // User is banned, sign them out
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setUserRole(null);
        setIsMainAdmin(false);
        setIsAdmin(false);
        setIsStaff(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        const role = data.role as UserRole;
        setUserRole(role);
        setIsMainAdmin(role === 'main_admin');
        setIsAdmin(role === 'admin' || role === 'main_admin');
        setIsStaff(role === 'staff');
      } else {
        setUserRole(null);
        setIsMainAdmin(false);
        setIsAdmin(false);
        setIsStaff(false);
      }
    } catch {
      setUserRole(null);
      setIsMainAdmin(false);
      setIsAdmin(false);
      setIsStaff(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsStaff(false);
    setIsMainAdmin(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isStaff,
        isMainAdmin,
        userRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
