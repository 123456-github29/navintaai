import {
  Squares2X2Icon,
  SwatchIcon,
  ChartBarIcon,
  CalendarIcon,
  FolderIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Squares2X2Icon,
  },
  {
    title: "Library",
    url: "/library",
    icon: FolderIcon,
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: CalendarIcon,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: ChartBarIcon,
  },
  {
    title: "Brand Kit",
    url: "/brand-kit",
    icon: SwatchIcon,
  },
];

const bottomItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Cog6ToothIcon,
  },
];


export function AppSidebar() {
  const [location] = useLocation();
  const { signOut, user } = useAuth();

  const userMetadata = user?.user_metadata || {};
  const userName = userMetadata.full_name || userMetadata.name || user?.email?.split('@')[0] || 'User';
  const userAvatar = userMetadata.avatar_url || userMetadata.picture;
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <Sidebar className="border-r border-white/[0.06]" style={{ background: "#0a0a0a" }}>
      <SidebarHeader className="p-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
          <span className="text-white text-lg font-semibold tracking-tight">Navinta AI</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url === "/dashboard" && location === "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`h-10 px-4 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-white/10 text-white font-medium border border-white/[0.08]'
                          : 'text-white/35 hover:bg-white/5 hover:text-white/60 border border-transparent'
                      }`}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                        <item.icon className={`h-[18px] w-[18px] ${isActive ? 'text-white' : ''}`} />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom items */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {bottomItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`h-10 px-4 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-white/10 text-white font-medium border border-white/[0.08]'
                          : 'text-white/35 hover:bg-white/5 hover:text-white/60 border border-transparent'
                      }`}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto border-t border-white/[0.06]">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors duration-200 cursor-pointer mb-2">
          <Avatar className="h-9 w-9 rounded-xl">
            <AvatarImage src={userAvatar} className="rounded-xl" />
            <AvatarFallback className="rounded-xl bg-white/10 text-white/60 text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white/80">
              {userName}
            </p>
            <p className="text-xs text-white/25 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 h-10 px-4 text-white/25 hover:text-white/50 hover:bg-white/5 rounded-xl transition-all duration-200"
          onClick={signOut}
          data-testid="button-logout"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          <span className="text-sm">Log out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
