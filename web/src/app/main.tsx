import { createRoot } from 'react-dom/client';
import { SalesManagementApp } from './sales-management-app';
import '../styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy điểm khởi tạo ứng dụng.');
}

createRoot(rootElement).render(<SalesManagementApp />);
