import type { EmailItem } from '../../types/api';
import EmailsTable from './EmailsTable';

type SentEmailsProps = {
  items: EmailItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
  isSearching: boolean;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onCompose: () => void;
};

export default function SentEmails(props: SentEmailsProps) {
  return <EmailsTable view="sent" {...props} />;
}