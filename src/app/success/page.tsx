import { redirect } from 'next/navigation'

export default function SuccessPage() {
  // Redirect to the static HTML file
  redirect('/success.html')
}
