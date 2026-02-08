import { redirect } from 'next/navigation';

export default function PreRegisterRedirect() {
  redirect('/register');
}
