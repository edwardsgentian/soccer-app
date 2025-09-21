import { Button } from "@/components/ui/button";
import { SupabaseTest } from "@/components/supabase-test";
import { StripeTest } from "@/components/stripe-test";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            ⚽ Soccer App
          </h1>
          <p className="text-xl text-muted-foreground">
            Built with the modern web stack
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          <div className="p-6 border rounded-lg bg-card">
            <h3 className="font-semibold text-card-foreground mb-2">Next.js</h3>
            <p className="text-sm text-muted-foreground">
              React framework with App Router
            </p>
          </div>
          
          <div className="p-6 border rounded-lg bg-card">
            <h3 className="font-semibold text-card-foreground mb-2">shadcn/ui</h3>
            <p className="text-sm text-muted-foreground">
              Beautiful, accessible components
            </p>
          </div>
          
          <div className="p-6 border rounded-lg bg-card">
            <h3 className="font-semibold text-card-foreground mb-2">Supabase</h3>
            <p className="text-sm text-muted-foreground">
              Backend as a Service
            </p>
          </div>
          
          <div className="p-6 border rounded-lg bg-card">
            <h3 className="font-semibold text-card-foreground mb-2">Stripe</h3>
            <p className="text-sm text-muted-foreground">
              Payment processing
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-8">
          <Button>Get Started</Button>
          <Button variant="outline">Learn More</Button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SupabaseTest />
          <StripeTest />
        </div>

        <div className="text-sm text-muted-foreground mt-12">
          <p>Deploy to Vercel • Connect to GitHub • Ready for production</p>
        </div>
      </div>
    </div>
  );
}
