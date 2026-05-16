import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  HeadphonesIcon,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: ShoppingCart, label: "Pedidos", path: "/pedidos" },
  { icon: Package, label: "Produtos", path: "/produtos" },
  { icon: HeadphonesIcon, label: "Suporte", path: "/suporte" },
  { icon: Layers, label: "Categorias ", path: "/categorias" },
  { icon: MessageSquare, label: "Chat IA", path: "/chat-ia" },
  {
    icon: ShieldCheck,
    label: "Operadores",
    path: "/operadores",
    roles: ["admin", "super_admin"],
  },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { logout, hasRole } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || hasRole(...item.roles),
  );

  return (
    <aside
      className={cn(
        "min-h-screen flex flex-col items-center py-6 fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out",
        isHovered ? "w-64" : "w-20",
      )}
      style={{
        backgroundColor: isHovered
          ? "var(--sidebar-glass-hover)"
          : "var(--sidebar-glass-default)",
        backdropFilter: isHovered ? "blur(10px)" : "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="mb-10">
        <div className="w-10 h-10 bg-none rounded-lg flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="41"
            height="32"
            viewBox="0 0 41 32"
            fill="none"
          >
            <path
              d="M37.6086 0C39.1413 2.13785 40.2594 4.56482 40.8605 7.17969C38.2156 7.05601 35.7142 7.69789 33.5802 8.91113C32.1137 9.74742 30.8273 10.8547 29.7814 12.1621C28.1885 14.1645 27.1722 16.6385 27.0099 19.3594C26.9378 20.5666 27.0526 21.7385 27.299 22.8633C27.846 25.3369 29.1086 27.5575 30.8879 29.2949C28.5856 30.5788 26.0066 31.4446 23.2775 31.7803C23.2722 31.7751 23.267 31.7649 23.2658 31.7627C22.0215 31.9158 20.7409 31.9681 19.4425 31.8916C8.02732 31.232 -0.682749 21.6266 -0.00961083 10.4424L7.45035 10.8838V10.8896C7.02356 18.0337 12.5894 24.1648 19.881 24.5889H20.0197C19.6049 22.7749 19.4297 20.8781 19.55 18.9346C19.7063 16.3492 20.3558 13.9048 21.3957 11.6846C23.2171 7.78575 26.2473 4.57612 29.9982 2.48535C32.3004 1.2015 34.8796 0.335694 37.6086 0Z"
              fill="#0070DB"
            />
          </svg>
        </div>
      </div>

      {/* Main Navigation */}
      <nav
        className={cn(
          "flex-1 flex flex-col items-center gap-2 w-full transition-all duration-300",
          isHovered ? "px-3" : "",
        )}
      >
        {visibleNavItems.map((item) => (
          <NavButton
            key={item.label}
            item={item}
            isSidebarHovered={isHovered}
          />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div
        className={cn(
          "flex flex-col items-center gap-2 mt-auto w-full transition-all duration-300",
          isHovered ? "px-3" : "",
        )}
      >
        {bottomNavItems.map((item) => (
          <NavButton
            key={item.label}
            item={item}
            isSidebarHovered={isHovered}
          />
        ))}
        <button
          onClick={handleLogout}
          className={cn(
            "h-12 rounded-xl flex items-center transition-all duration-200 group",
            isHovered ? "w-full px-4 justify-start" : "w-12 justify-center",
            "hover:bg-[#ADE9FF] bg-transparent",
          )}
          title="Sair"
        >
          <LogOut
            className={cn(
              "w-5 h-5",
              isHovered && "mr-3",
              "group-hover:text-[#020854]",
            )}
            style={{ color: "#0070DB" }}
          />
          {isHovered && (
            <span
              className="text-sm font-medium group-hover:text-[#020854]"
              style={{ color: "#0070DB" }}
            >
              Sair
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

function NavButton({
  item,
  isSidebarHovered,
}: {
  item: NavItem;
  isSidebarHovered: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          "h-12 rounded-xl flex items-center transition-all duration-200 group",
          isSidebarHovered
            ? "w-full px-4 justify-start"
            : "w-12 justify-center",
          "hover:bg-[#ADE9FF]",
          isActive ? "bg-[#0070DB]" : "bg-transparent",
        )
      }
      title={item.label}
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "w-5 h-5",
              isSidebarHovered && "mr-3",
              isActive
                ? "text-white"
                : "text-[#0070DB] group-hover:text-[#020854]",
            )}
            style={isActive ? undefined : { color: "#0070DB" }}
          />
          {isSidebarHovered && (
            <span
              className={cn(
                "text-sm font-medium",
                isActive
                  ? "text-white"
                  : "text-[#0070DB] group-hover:text-[#020854]",
              )}
              style={isActive ? undefined : { color: "#0070DB" }}
            >
              {item.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
