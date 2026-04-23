import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { Loader2 } from "lucide-react";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Medicines = lazy(() => import("./pages/Medicines"));
const Sales = lazy(() => import("./pages/Sales"));
const Customers = lazy(() => import("./pages/Customers"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Reports = lazy(() => import("./pages/Reports"));
const ExpiryAlerts = lazy(() => import("./pages/ExpiryAlerts"));
const Settings = lazy(() => import("./pages/Settings"));
const Users = lazy(() => import("./pages/Users"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Activity = lazy(() => import("./pages/Activity"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}

const protectedPage = (Page: React.ComponentType) => (
  <ProtectedRoute>
    <AppLayout>
      <Suspense fallback={<PageFallback />}>
        <Page />
      </Suspense>
    </AppLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="sandhya-pharmacy-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={protectedPage(Dashboard)} />
                  <Route path="/ai-assistant" element={protectedPage(AIAssistant)} />
                  <Route path="/medicines" element={protectedPage(Medicines)} />
                  <Route path="/sales" element={protectedPage(Sales)} />
                  <Route path="/invoices" element={protectedPage(Invoices)} />
                  <Route path="/customers" element={protectedPage(Customers)} />
                  <Route path="/suppliers" element={protectedPage(Suppliers)} />
                  <Route path="/purchases" element={protectedPage(Purchases)} />
                  <Route path="/reports" element={protectedPage(Reports)} />
                  <Route path="/expiry-alerts" element={protectedPage(ExpiryAlerts)} />
                  <Route path="/activity" element={protectedPage(Activity)} />
                  <Route path="/users" element={protectedPage(Users)} />
                  <Route path="/settings" element={protectedPage(Settings)} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
