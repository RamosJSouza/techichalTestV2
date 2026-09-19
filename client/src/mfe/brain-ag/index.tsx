import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AppThemeProvider } from '../../shared/theme/ThemeContext';
import { GlobalStyle } from '../../shared/theme/GlobalStyle';
import { store } from '../../store/store';
import { AppShellTemplate } from '../../components/templates/AppShellTemplate';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProducersListPage } from '../../pages/ProducersListPage';
import { ProducerFormPage } from '../../pages/ProducerFormPage';
import { ProducerEsgPage } from '../../pages/ProducerEsgPage';

/** Fronteira MFE-ready: exportar este App em Module Federation no futuro. */
export function BrainAgApp(): React.JSX.Element {
  return (
    <Provider store={store}>
      <AppThemeProvider>
        <GlobalStyle />
        <BrowserRouter>
          <Routes>
            <Route element={<AppShellTemplate />}>
              <Route index element={<DashboardPage />} />
              <Route path="producers" element={<ProducersListPage />} />
              <Route path="producers/new" element={<ProducerFormPage />} />
              <Route path="producers/:id/edit" element={<ProducerFormPage />} />
              <Route path="producers/:id/esg" element={<ProducerEsgPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppThemeProvider>
    </Provider>
  );
}
