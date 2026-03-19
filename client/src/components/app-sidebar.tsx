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
  { title: "Dashboard", url: "/dashboard", icon: Squares2X2Icon },
  { title: "Library", url: "/library", icon: FolderIcon },
  { title: "Schedule", url: "/schedule", icon: CalendarIcon },
  { title: "Analytics", url: "/analytics", icon: ChartBarIcon },
  { title: "Brand Kit", url: "/brand-kit", icon: SwatchIcon },
];

const bottomItems = [
  { title: "Settings", url: "/settings", icon: Cog6ToothIcon },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { signOut, user } = useAuth();

  const userMetadata = user?.user_metadata || {};
  const userName = userMetadata.full_name || userMetadata.name || user?.email?.split('@')[0] || 'User';
  const userAvatar = userMetadata.avatar_url || userMetadata.picture;
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <Sidebar
      className="border-r"
      style={{ background: "#0d0d0d", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <SidebarHeader className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
          <span className="logo-text text-lg text-white">Navinta AI</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url === "/dashboard" && location === "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`h-10 px-3.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'font-semibold'
                          : 'border border-transparent'
                      }`}
                      style={isActive ? {
                        background: "rgba(255,255,255,0.08)",
                        color: "#ffffff",
                        border: "1px solid rgba(255,255,255,0.1)",
                      } : {
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                        <item.icon
                          className="h-[18px] w-[18px] shrink-0"
                          style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.3)" }}
                        />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {bottomItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`h-10 px-3.5 rounded-lg transition-all duration-200 ${
                        isActive ? 'font-semibold' : 'border border-transparent'
                      }`}
                      style={isActive ? {
                        background: "rgba(255,255,255,0.08)",
                        color: "#ffffff",
                        border: "1px solid rgba(255,255,255,0.1)",
                      } : {
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon
                          className="h-[18px] w-[18px] shrink-0"
                          style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.3)" }}
                        />
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

      <SidebarFooter className="p-4 mt-auto border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 p-2.5 rounded-lg transition-colors duration-200 cursor-pointer mb-2" style={{ background: "transparent" }}>
          <Avatar className="h-9 w-9 rounded-lg">
            <AvatarImage src={userAvatar} className="rounded-lg" />
            <AvatarFallback className="rounded-lg text-xs font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-white">{userName}</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 h-10 px-3.5 rounded-lg transition-all duration-200 hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.3)" }}
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
