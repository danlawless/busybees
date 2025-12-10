/**
 * Pre-Registration Page
 * Allows families to pre-register before their first visit
 * so check-in at the kiosk is faster
 */

import { Metadata } from 'next';
import { Layout } from '@/components/layout/Layout';
import { PreRegisterForm } from '@/components/pre-register/PreRegisterForm';

export const metadata: Metadata = {
  title: 'Pre-Register | Busy Bees Indoor Play Center',
  description: 'Pre-register your family before your first visit to Busy Bees Indoor Play Center. Skip the line and get straight to playing!',
};

export default function PreRegisterPage() {
  return (
    <Layout>
      <PreRegisterForm />
    </Layout>
  );
}
