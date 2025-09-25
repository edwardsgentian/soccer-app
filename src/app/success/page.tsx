import { redirect } from 'next/navigation'

export default function SuccessPage() {
  // Redirect to home page with success message
  redirect('/?payment=success')
}
