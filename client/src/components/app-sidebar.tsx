import { 
  Squares2X2Icon, 
  VideoCameraIcon, 
  SwatchIcon, 
  ChartBarIcon, 
  CalendarIcon, 
  FolderIcon, 
  ArrowRightOnRectangleIcon,
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


export function AppSidebar() {
  const [location] = useLocation();
  const { signOut, user } = useAuth();

  const userMetadata = user?.user_metadata || {};
  const userName = userMetadata.full_name || userMetadata.name || user?.email?.split('@')[0] || 'User';
  const userAvatar = userMetadata.avatar_url || userMetadata.picture;
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <Sidebar className="border-r border-gray-100 bg-white">
      <SidebarHeader className="p-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
          <span className="text-[#111111] text-xl font-semibold tracking-tight">Navinta AI</span>
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
                      className={`h-10 px-4 rounded-full transition-all duration-200 ${
                        isActive 
                          ? 'bg-[#111111] text-white font-medium' 
                          : 'text-[#666666] hover:bg-gray-50 hover:text-[#111111]'
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
      </SidebarContent>
      
      <SidebarFooter className="p-4 mt-auto border-t border-gray-100">
        <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 transition-colors duration-200 cursor-pointer mb-2">
          <Avatar className="h-9 w-9 rounded-full">
            <AvatarImage src={userAvatar} className="rounded-full" />
            <AvatarFallback className="rounded-full bg-gray-100 text-[#111111] text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-[#111111]">
              {userName}
            </p>
            <p className="text-xs text-[#666666] truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start gap-3 h-10 px-4 text-[#666666] hover:text-[#111111] hover:bg-gray-50 rounded-full transition-all duration-200" 
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
