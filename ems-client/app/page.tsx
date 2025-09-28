import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to our beautiful landing page
  redirect('/landing');
}
