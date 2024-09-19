import type { Metadata } from 'next';
import RootLayoutClient from './RootLayoutClient';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Botify SEMRush Combination Tool',
    default: 'Botify SEMRush Combination Tool',
  },
  description: 'Process and combine SEMRush CSV files',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RootLayoutClient>{children}</RootLayoutClient>;
}