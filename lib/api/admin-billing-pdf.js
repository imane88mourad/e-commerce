import apiClient from './client';

/**
 * PDF operations for invoices and quotes.
 */
export const billingPdfApi = {
  /** Download invoice PDF — opens in new tab */
  downloadInvoicePdf: async (invoiceId) => {
    const token = localStorage.getItem('access_token');
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/invoices/${invoiceId}/pdf/`;
    window.open(`${url}?token=${token}`, '_blank');
  },

  /** Download quote PDF — opens in new tab */
  downloadQuotePdf: async (quoteId) => {
    const token = localStorage.getItem('access_token');
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/quotes/${quoteId}/pdf/`;
    window.open(`${url}?token=${token}`, '_blank');
  },

  /** Send invoice PDF by email */
  emailInvoicePdf: async (invoiceId) => {
    return apiClient.post(`/invoices/${invoiceId}/email-pdf/`);
  },

  /** Send quote PDF by email */
  emailQuotePdf: async (quoteId) => {
    return apiClient.post(`/quotes/${quoteId}/email-pdf/`);
  },

  /** Download invoice PDF as blob (for inline preview) */
  getInvoicePdfBlob: async (invoiceId) => {
    const token = localStorage.getItem('access_token');
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/invoices/${invoiceId}/pdf/`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Erreur lors du téléchargement du PDF');
    return response.blob();
  },

  /** Download quote PDF as blob */
  getQuotePdfBlob: async (quoteId) => {
    const token = localStorage.getItem('access_token');
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/quotes/${quoteId}/pdf/`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Erreur lors du téléchargement du PDF');
    return response.blob();
  },
};
