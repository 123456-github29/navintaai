import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TermsAcceptance } from "@/components/terms-acceptance";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Pricing from "@/pages/pricing";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import PostDetail from "@/pages/post-detail";

import Editor from "@/pages/editor";

import Library from "@/pages/library";
import BrandKitPage from "@/pages/brand-kit";
import Schedule from "@/pages/schedule";
import Analytics from "@/pages/analytics";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import BillingSuccess from "@/pages/billing-success";
import BillingCancel from "@/pages/billing-cancel";

import PhoneRecorder from "@/pages/phone-recorder";
import Contact from "@/pages/contact";
import Waitlist from "@/pages/waitlist";

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <TermsAcceptance>
              <AuthRouter sidebarStyle={style} />
            </TermsAcceptance>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AuthRouter({ sidebarStyle }: { sidebarStyle: any }) {
  const { isAuthenticated, isLoading, error, retry } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#111111] mb-4"></div>
        <p className="text-[#666666]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white text-center px-4">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-[#111111] mb-4">Authentication Error</h1>
          <p className="text-[#666666] mb-6">{error}</p>
          <button
            onClick={retry}
            className="px-6 py-3 bg-[#111111] text-white rounded-full hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const waitlistApproved = typeof window !== "undefined" && localStorage.getItem("waitlist_approved") === "true";

  if (!isAuthenticated) {
    if (!waitlistApproved) {
      return (
        <Switch>
          <Route path="/waitlist" component={Waitlist} />
          <Route path="/record/phone" component={PhoneRecorder} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfService} />
          <Route path="/contact" component={Contact} />
          <Route component={Waitlist} />
        </Switch>
      );
    }

    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/record/phone" component={PhoneRecorder} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/contact" component={Contact} />
        <Route path="/waitlist" component={Waitlist} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <Switch>
        <Route path="/record/phone" component={PhoneRecorder} />
        <Route path="/onboarding" component={Onboarding} />


        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/contact" component={Contact} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/billing/success" component={BillingSuccess} />
        <Route path="/billing/cancel" component={BillingCancel} />

        <Route>
          <div className="flex h-screen w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden bg-white">
              <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-white/90 backdrop-blur-xl sticky top-0 z-40">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="text-[#666666] hover:text-[#111111] hover:bg-gray-50 rounded-lg" />
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/dashboard" component={Dashboard} />
                  <Route path="/post/:id" component={PostDetail} />
                  <Route path="/editor/:id" component={Editor} />
                  <Route path="/library" component={Library} />
                  <Route path="/brand-kit" component={BrandKitPage} />
                  <Route path="/schedule" component={Schedule} />
                  <Route path="/analytics" component={Analytics} />
                  <Route component={NotFound} />
                </Switch>
              </main>
            </div>
          </div>
        </Route>
      </Switch>
    </SidebarProvider>
  );
}

export default App;
