import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AppThemeProvider } from '../../shared/theme/ThemeContext';
import { GlobalStyle } from '../../shared/theme/GlobalStyle';
import { store } from '../../store/store';
import { AppShellTemplate } from '../../components/templates/AppShellTemplate';
import { Spinner } from '../../components/atoms/Spinner';
import { useEsgCarFeature } from '../../shared/lib/use-esg-car-enabled';

const DashboardPage = lazy(async () => {
  const mod = await import('../../pages/DashboardPage');
  return { default: mod.DashboardPage };
});
const ProducersListPage = lazy(async () => {
  const mod = await import('../../pages/ProducersListPage');
  return { default: mod.ProducersListPage };
});
const ProducerFormPage = lazy(async () => {
  const mod = await import('../../pages/ProducerFormPage');
  return { default: mod.ProducerFormPage };
});
const ProducerEsgPage = lazy(async () => {
  const mod = await import('../../pages/ProducerEsgPage');
  return { default: mod.ProducerEsgPage };
});

function EsgFeatureRoute(): React.JSX.Element {
  const feature = useEsgCarFeature();
  if (!feature.ready) {
    return <Spinner />;
  }
  if (!feature.enabled) {
    return <Navigate to="/producers" replace />;
  }
  return <ProducerEsgPage />;
}

export function BrainAgApp(): React.JSX.Element {
  return (
    <Provider store={store}>
      <AppThemeProvider>
        <GlobalStyle />
        <BrowserRouter>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route element={<AppShellTemplate />}>
                <Route index element={<DashboardPage />} />
                <Route path="producers" element={<ProducersListPage />} />
                <Route path="producers/new" element={<ProducerFormPage />} />
                <Route path="producers/:id/edit" element={<ProducerFormPage />} />
                <Route path="producers/:id/esg" element={<EsgFeatureRoute />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppThemeProvider>
    </Provider>
  );
}
