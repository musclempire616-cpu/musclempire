import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import FloatingContact from "@/components/FloatingContact";
import DemoBar from "@/components/DemoBar";
import OfferPopup from "@/components/OfferPopup";
import GlobalMenu from "@/components/GlobalMenu";

const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const Products = lazy(() => import("@/pages/Products"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const NutritionAssessment = lazy(() => import("@/pages/NutritionAssessment"));
const Offers = lazy(() => import("@/pages/Offers"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminCustomer = lazy(() => import("@/pages/AdminCustomer"));
const AdminTrackRecord = lazy(() => import("@/pages/AdminTrackRecord"));
const TermsPage = lazy(() => import("@/pages/Terms"));
const GalleryPage = lazy(() => import("@/pages/GalleryPage"));
const BranchesPage = lazy(() => import("@/pages/Branches"));
const AdminGallery = lazy(() => import("@/pages/AdminGallery"));
const AdminOffers = lazy(() => import("@/pages/AdminOffers"));

const queryClient = new QueryClient();

// Clear old localStorage cache keys on every load — but NOT coupons/offers data
if (typeof localStorage !== "undefined") {
  const keysToRemove = [
    "me_offers_v2",      // always clear — Sheets is source of truth for offers
    "me_offers_ts",
    "me_gallery_images", "me_gallery_images_ts",
    "me_gallery_images_v2",
    "me_gallery_videos", "me_gallery_videos_ts",
    "me_gallery_videos_v2",
    "me_assessments_ts",
    // DO NOT clear me_coupons_v2 — this would delete all coupons
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

// Ctrl+Shift+S+K opens admin login (SAGAR KHARAT)
function AdminShortcut() {
  useEffect(() => {
    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys.add(e.key.toLowerCase());
      
      const ctrl = e.ctrlKey || activeKeys.has("control");
      const shift = e.shiftKey || activeKeys.has("shift");
      const hasS = activeKeys.has("s");
      const hasK = activeKeys.has("k");

      if (ctrl && shift && hasS && hasK) {
        e.preventDefault();
        activeKeys.clear();
        window.open("/sagarkharat", "_blank");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.key.toLowerCase());
    };

    const handleBlur = () => {
      activeKeys.clear();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);
  return null;
}

// Save scroll position per route and restore on back navigation
function ScrollRestoration() {
  const [location] = useLocation();
  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll_${location}`);
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
    } else {
      window.scrollTo(0, 0);
    }
    const saveScroll = () => {
      sessionStorage.setItem(`scroll_${location}`, String(window.scrollY));
    };
    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => window.removeEventListener("scroll", saveScroll);
  }, [location]);
  return null;
}

function PublicWidgets() {
  const [location] = useLocation();
  if (location.startsWith("/sagarkharat")) return null;
  return (
    <>
      <FloatingContact />
      <DemoBar />
      <OfferPopup />
      <GlobalMenu />
    </>
  );
}

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/nutrition" component={NutritionAssessment} />
        <Route path="/offers" component={Offers} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/gallery" component={GalleryPage} />
        <Route path="/branches" component={BranchesPage} />
        <Route path="/sagarkharat/gallery" component={AdminGallery} />
        <Route path="/sagarkharat/offers" component={AdminOffers} />
        {/* Private admin routes */}
        <Route path="/sagarkharat" component={AdminLogin} />
        <Route path="/sagarkharat/dashboard" component={AdminDashboard} />
        <Route path="/sagarkharat/customer/:id" component={AdminCustomer} />
        <Route path="/sagarkharat/track/:phone" component={AdminTrackRecord} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AdminShortcut />
          <ScrollRestoration />
          <Router />
          <PublicWidgets />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
