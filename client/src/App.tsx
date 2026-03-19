import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
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
import Settings from "@/pages/settings";

import Editor from "@/pages/editor";
import AiEditor from "@/pages/ai-editor";
import Director from "@/pages/director";

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
import HowItWorksPage from "@/pages/how-it-works";
import DevDashboard from "@/pages/dev-dashboard";

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
      <div className="flex flex-col items-center justify-center h-screen" style={{ background: "#0d0d0d" }}>
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full" style={{ border: "2px solid rgba(255,255,255,0.06)" }} />
          <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid transparent", borderTopColor: "rgba(255,255,255,0.6)" }} />
        </div>
        <p className="mt-6 text-sm font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>Loading</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4" style={{ background: "#0d0d0d" }}>
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>{error}</p>
          <button
            onClick={retry}
            className="px-8 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: "#ffffff", color: "#0d0d0d" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const waitlistApproved = typeof window !== "undefined" && localStorage.getItem("waitlist_approved") === "true";

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/how-it-works" component={HowItWorksPage} />
        <Route path="/record/phone" component={PhoneRecorder} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/contact" component={Contact} />
        <Route path="/dev" component={DevDashboard} />
        <Route component={Landing} />
      </Switch>
    );
  }

  if (!waitlistApproved) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/how-it-works" component={HowItWorksPage} />
        <Route path="/record/phone" component={PhoneRecorder} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/contact" component={Contact} />
        <Route path="/dev" component={DevDashboard} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <Switch>
        <Route path="/dev" component={DevDashboard} />
        <Route path="/record/phone" component={PhoneRecorder} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/contact" component={Contact} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/how-it-works" component={HowItWorksPage} />
        <Route path="/billing/success" component={BillingSuccess} />
        <Route path="/billing/cancel" component={BillingCancel} />

        <Route>
          <div className="flex h-screen w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "#0d0d0d" }}>
              <header className="flex items-center justify-between gap-4 px-6 py-3 sticky top-0 z-40" style={{ background: "rgba(13,13,13,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <SidebarTrigger data-testid="button-sidebar-toggle" className="rounded-lg transition-colors hover:bg-white/5" style={{ color: "rgba(255,255,255,0.3)" }} />
              </header>
              <main className="flex-1 overflow-auto">
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/dashboard" component={Dashboard} />
                  <Route path="/post/:id" component={PostDetail} />
                  <Route path="/director/:id" component={Director} />
                  <Route path="/editor/:id" component={Editor} />
                  <Route path="/ai-editor/:id" component={AiEditor} />
                  <Route path="/library" component={Library} />
                  <Route path="/brand-kit" component={BrandKitPage} />
                  <Route path="/schedule" component={Schedule} />
                  <Route path="/analytics" component={Analytics} />
                  <Route path="/settings" component={Settings} />
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
