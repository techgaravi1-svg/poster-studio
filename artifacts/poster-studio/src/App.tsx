import { lazy, Suspense, type ReactNode, useEffect, useState, useCallback } from 'react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { SiteShell } from '@/components/storefront';
import { BrandIntroAnimation } from '@/components/brand-intro';
import NotFound from '@/pages/not-found';
import {
  AccountPage,
  BagPage,
  CartPage,
  CheckoutPage,
  CollectionPage,
  CustomPage,
  HomePage,
  OrderDetailPage,
  OrderSuccessPage,
  OrdersPage,
  ProductPage,
  SearchPage,
  WishlistPage,
} from '@/pages/store-pages';

// Code-split heavy routes so initial storefront payload stays ultra-lightweight
const AdminDashboardPage = lazy(() => import('@/pages/admin-page').then((m) => ({ default: m.AdminDashboardPage })));
const AddressesPage = lazy(() => import('@/pages/addresses-page').then((m) => ({ default: m.AddressesPage })));
const FaqPage = lazy(() => import('@/pages/policy-pages').then((m) => ({ default: m.FaqPage })));
const TermsPage = lazy(() => import('@/pages/policy-pages').then((m) => ({ default: m.TermsPage })));
const ReturnPolicyPage = lazy(() => import('@/pages/policy-pages').then((m) => ({ default: m.ReturnPolicyPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/policy-pages').then((m) => ({ default: m.PrivacyPolicyPage })));

const INTRO_KEY = 'dungeons_intro_played';

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [location]);
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center p-8"><div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" /></div>}>
      {children}
    </Suspense>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Dedicated Standalone Enterprise Admin Portal */}
        <Route path="/admin">
          <PageSuspense><AdminDashboardPage /></PageSuspense>
        </Route>
        <Route path="/admin/:sub*">
          <PageSuspense><AdminDashboardPage /></PageSuspense>
        </Route>

        {/* Customer Storefront with Public Site Shell */}
        <Route>
          <SiteShell>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/collections" component={CollectionPage} />
              <Route path="/collections/:slug" component={CollectionPage} />
              <Route path="/categories" component={CollectionPage} />
              <Route path="/categories/:slug" component={CollectionPage} />
              <Route path="/category" component={CollectionPage} />
              <Route path="/category/:slug" component={CollectionPage} />
              <Route path="/best-sellers" component={() => <CollectionPage bestsellers />} />
              <Route path="/custom" component={CustomPage} />
              <Route path="/products/:slug" component={ProductPage} />
              <Route path="/wishlist" component={WishlistPage} />
              <Route path="/bag" component={BagPage} />
              <Route path="/cart" component={CartPage} />
              <Route path="/checkout/success" component={OrderSuccessPage} />
              <Route path="/checkout" component={CheckoutPage} />
              <Route path="/account/orders/:id" component={OrderDetailPage} />
              <Route path="/account/orders" component={OrdersPage} />
              <Route path="/account/addresses">
                <PageSuspense><AddressesPage /></PageSuspense>
              </Route>
              <Route path="/addresses">
                <PageSuspense><AddressesPage /></PageSuspense>
              </Route>
              <Route path="/account" component={AccountPage} />
              <Route path="/search" component={SearchPage} />
              <Route path="/faqs">
                <PageSuspense><FaqPage /></PageSuspense>
              </Route>
              <Route path="/faq">
                <PageSuspense><FaqPage /></PageSuspense>
              </Route>
              <Route path="/terms">
                <PageSuspense><TermsPage /></PageSuspense>
              </Route>
              <Route path="/terms-and-conditions">
                <PageSuspense><TermsPage /></PageSuspense>
              </Route>
              <Route path="/returns">
                <PageSuspense><ReturnPolicyPage /></PageSuspense>
              </Route>
              <Route path="/return-policy">
                <PageSuspense><ReturnPolicyPage /></PageSuspense>
              </Route>
              <Route path="/refund-policy">
                <PageSuspense><ReturnPolicyPage /></PageSuspense>
              </Route>
              <Route path="/shipping-policy">
                <PageSuspense><ReturnPolicyPage /></PageSuspense>
              </Route>
              <Route path="/privacy">
                <PageSuspense><PrivacyPolicyPage /></PageSuspense>
              </Route>
              <Route path="/privacy-policy">
                <PageSuspense><PrivacyPolicyPage /></PageSuspense>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </SiteShell>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function App() {
  // Show intro once per browser session (cleared when tab is closed)
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem(INTRO_KEY);
    } catch {
      return false;
    }
  });

  const handleIntroComplete = useCallback(() => {
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* ignore */ }
    setShowIntro(false);
  }, []);

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      {showIntro && <BrandIntroAnimation onComplete={handleIntroComplete} />}
      <Router />
    </WouterRouter>
  );
}

export default App;