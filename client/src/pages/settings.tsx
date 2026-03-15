import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getQueryFn } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserCircleIcon,
  CreditCardIcon,
  BoltIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Link } from "wouter";

interface SubscriptionData {
  plan: string;
  status: string;
  watermarkRequired: boolean;
  aiBroll: boolean;
  aiVoice: boolean;
  maxExports: number;
  exportsUsedToday: number;
  exportAllowed: boolean;
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  cancelAtPeriodEnd?: boolean;
  billingInterval?: "monthly" | "yearly" | null;
}

export default function Settings() {
  const { user, session } = useAuth();
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);

  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError } = useQuery<SubscriptionData | null>({
    queryKey: ["/api/subscription"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const userMetadata = user?.user_metadata || {};
  const userName = userMetadata.full_name || userMetadata.name || user?.email?.split('@')[0] || 'User';
  const userAvatar = userMetadata.avatar_url || userMetadata.picture;
  const userInitials = userName.slice(0, 2).toUpperCase();

  const handleManageBilling = async () => {
    setBillingPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ returnUrl: "/settings" }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to open billing portal:", err);
    } finally {
      setBillingPortalLoading(false);
    }
  };

  const plan = subscription?.plan || "free";
  const planLabels: Record<string, string> = { free: "Free", starter: "Starter", pro: "Pro", studio: "Studio" };
  const planName = planLabels[plan] || "Free";
  const isPaid = plan !== "free";
  const exportsText = subscription?.maxExports === -1
    ? "Unlimited"
    : `${subscription?.exportsUsedToday || 0} / ${subscription?.maxExports || 3}`;

  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-screen" style={{ background: "#050505" }}>
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
          <p className="text-sm text-white/30 mt-1">Manage your profile and subscription</p>
        </div>

        {/* Profile Section */}
        <section className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <UserCircleIcon className="h-5 w-5 text-white/40" />
            <h2 className="text-lg font-semibold text-white">Profile</h2>
          </div>

          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 rounded-2xl">
              <AvatarImage src={userAvatar} className="rounded-2xl" />
              <AvatarFallback className="rounded-2xl bg-white/10 text-white/60 text-lg font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{userName}</h3>
              <p className="text-sm text-white/30 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
              <span className="text-sm text-white/40">Email</span>
              <span className="text-sm text-white/70 font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
              <span className="text-sm text-white/40">Name</span>
              <span className="text-sm text-white/70 font-medium">{userName}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
              <span className="text-sm text-white/40">Auth provider</span>
              <span className="text-sm text-white/70 font-medium">Google</span>
            </div>
          </div>
        </section>

        {/* Subscription Section */}
        <section className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCardIcon className="h-5 w-5 text-white/40" />
            <h2 className="text-lg font-semibold text-white">Subscription</h2>
          </div>

          {subscriptionLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-14 w-full bg-white/5 rounded-xl" />
              <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
              <Skeleton className="h-10 w-full bg-white/5 rounded-xl" />
            </div>
          ) : subscriptionError ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">Unable to load subscription</p>
                <p className="text-xs text-white/30 mt-1">Please try refreshing the page.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Current plan */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{planName} Plan</span>
                      {subscription?.status === "active" && isPaid && !subscription?.cancelAtPeriodEnd && (
                        <span className="text-[0.65rem] font-semibold border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    {subscription?.billingInterval && (
                      <p className="text-xs text-white/25 mt-0.5 capitalize">{subscription.billingInterval} billing</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan details */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
                  <span className="text-sm text-white/40">Exports today</span>
                  <span className="text-sm text-white/70 font-medium">{exportsText}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
                  <span className="text-sm text-white/40">Features</span>
                  <div className="flex gap-3">
                    {subscription?.aiBroll && (
                      <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                        <BoltIcon className="h-3.5 w-3.5" /> AI B-roll
                      </span>
                    )}
                    {subscription?.aiVoice && (
                      <span className="text-xs font-medium text-indigo-400 flex items-center gap-1">
                        <SparklesIcon className="h-3.5 w-3.5" /> AI Voice
                      </span>
                    )}
                    {!subscription?.aiBroll && !subscription?.aiVoice && (
                      <span className="text-xs text-white/25">Basic features</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
                  <span className="text-sm text-white/40">Watermark</span>
                  <span className="text-sm text-white/70 font-medium">
                    {subscription?.watermarkRequired ? "Yes" : "No"}
                  </span>
                </div>
                {subscription?.currentPeriodEnd && isPaid && (
                  <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
                    <span className="text-sm text-white/40">
                      {subscription?.cancelAtPeriodEnd ? "Access until" : "Next billing"}
                    </span>
                    <span className="text-sm text-white/70 font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Cancellation warning */}
              {subscription?.cancelAtPeriodEnd && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-6">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-sm text-amber-400 font-medium">
                      Cancels {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "at period end"}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {plan !== "studio" && (
                  <Link href="/pricing" className="flex-1">
                    <button className="w-full py-3 text-sm font-semibold bg-white text-black rounded-full hover:shadow-[0_0_30px_rgba(255,255,255,0.12)] transition-all">
                      Upgrade Plan
                    </button>
                  </Link>
                )}
                {isPaid && subscription?.stripeCustomerId && (
                  <button
                    onClick={handleManageBilling}
                    disabled={billingPortalLoading}
                    className="flex-1 py-3 text-sm font-medium text-white/60 bg-white/5 border border-white/8 rounded-full hover:bg-white/8 transition-all disabled:opacity-50"
                  >
                    {billingPortalLoading ? "Opening..." : "Manage Billing"}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
