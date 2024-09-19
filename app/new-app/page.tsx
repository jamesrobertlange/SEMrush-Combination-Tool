import type { Metadata } from 'next';
import NewAppClient from './NewAppClient';

export const metadata: Metadata = {
  title: 'New App',
};

export default function NewApp() {
  return <NewAppClient />;
}