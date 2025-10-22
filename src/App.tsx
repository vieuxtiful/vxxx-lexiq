import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { ProjectProvider } from "./contexts/ProjectContext";
import { AuthFlowProvider } from "./contexts/AuthFlowContext";
import { AppRouter } from "./components/AppRouter";
import { MantineProvider } from "./providers/MantineProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MantineProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner duration={3000} />
        <BrowserRouter>
          <ProjectProvider>
            <AuthFlowProvider>
              <Routes>
                <Route path="/" element={<AppRouter />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthFlowProvider>
          </ProjectProvider>
        </BrowserRouter>
      </TooltipProvider>
    </MantineProvider>
  </QueryClientProvider>
);

export default App;
