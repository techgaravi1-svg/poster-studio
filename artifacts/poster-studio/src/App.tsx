import { type ReactNode, useEffect } from 'react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { SiteShell } from '@/components/storefront';
import NotFound from '@/pages/not-found';
import {
  AccountPage,
  AdminPage,
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
import { FaqPage, TermsPage, ReturnPolicyPage, PrivacyPolicyPage } from '@/pages/policy-pages';
import { AddressesPage } from '@/pages/addresses-page';
import { AdminDashboardPage } from '@/pages/admin-page';

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [location]);
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Dedicated Standalone Enterprise Admin Portal */}
        <Route path="/admin" component={AdminDashboardPage} />
        <Route path="/admin/:sub*" component={AdminDashboardPage} />

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
              <Route path="/account/addresses" component={AddressesPage} />
              <Route path="/addresses" component={AddressesPage} />
              <Route path="/account" component={AccountPage} />
              <Route path="/search" component={SearchPage} />
              <Route path="/faqs" component={FaqPage} />
              <Route path="/faq" component={FaqPage} />
              <Route path="/terms" component={TermsPage} />
              <Route path="/terms-and-conditions" component={TermsPage} />
              <Route path="/returns" component={ReturnPolicyPage} />
              <Route path="/return-policy" component={ReturnPolicyPage} />
              <Route path="/refund-policy" component={ReturnPolicyPage} />
              <Route path="/shipping-policy" component={ReturnPolicyPage} />
              <Route path="/privacy" component={PrivacyPolicyPage} />
              <Route path="/privacy-policy" component={PrivacyPolicyPage} />
              <Route component={NotFound} />
            </Switch>
          </SiteShell>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>;
}

export default App;