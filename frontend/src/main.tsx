import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: {
          background: '#FFFFFF',
          color: '#111111',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(17, 17, 17, 0.08)'
        },
        success: { iconTheme: { primary: '#16A34A', secondary: '#FFFFFF' } },
        error: { iconTheme: { primary: '#C62828', secondary: '#FFFFFF' } }
      }} />
    </QueryClientProvider>
  </React.StrictMode>
);
