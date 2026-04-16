import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <AppSidebar />
      <main className="flex-1 ml-60 min-h-screen p-8" style={{ backgroundColor: '#ffffff' }}>
        <Outlet />
      </main>
    </div>
  );
}
