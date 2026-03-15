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
      <div className="flex flex-col items-center justify-center h-screen" style={{ background: "#000000" }}>
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
        </div>
        <p className="text-white/30 mt-6 text-sm font-medium tracking-wide">Loading</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4" style={{ background: "#000000" }}>
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
          <p className="text-white/40 mb-8 text-sm">{error}</p>
          <button
            onClick={retry}
            className="px-8 py-3 bg-white text-black rounded-full font-semibold text-sm hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const waitlistApproved = typeof window !== "undefined" && localStorage.getItem("waitlist_approved") === "true";

  // Unauthenticated users always see the landing page (which has waitlist gate built in)
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/record/phone" component={PhoneRecorder} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/contact" component={Contact} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Authenticated but not waitlist approved - redirect to landing
  if (!waitlistApproved) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/record/phone" component={PhoneRecorder} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/contact" component={Contact} />
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
            <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "#050505" }}>
              <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-40">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors" />
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
