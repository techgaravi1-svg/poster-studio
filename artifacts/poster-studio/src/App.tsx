import { type ReactNode, useEffect } from 'react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { SiteShell } from '@/components/storefront';
import NotFound from '@/pages/not-found';
import {
  AccountPage,
  AdminPage,
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
} from '@/pages/store-pages';

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [location]);
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><SiteShell><Switch>
    <Route path="/" component={HomePage} />
    <Route path="/collections" component={CollectionPage} />
    <Route path="/collections/:slug" component={CollectionPage} />
    <Route path="/best-sellers" component={() => <CollectionPage bestsellers />} />
    <Route path="/custom" component={CustomPage} />
    <Route path="/products/:slug" component={ProductPage} />
    <Route path="/cart" component={CartPage} />
    <Route path="/checkout/success" component={OrderSuccessPage} />
    <Route path="/checkout" component={CheckoutPage} />
    <Route path="/account/orders/:id" component={OrderDetailPage} />
    <Route path="/account/orders" component={OrdersPage} />
    <Route path="/account" component={AccountPage} />
    <Route path="/search" component={SearchPage} />
    <Route path="/admin" component={AdminPage} />
    <Route component={NotFound} />
  </Switch></SiteShell></RoutedErrorBoundary>;
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>;
}

export default App;