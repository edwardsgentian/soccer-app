'use client'

import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/game-card";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            ⚽ Women&apos;s Soccer Meetups
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join pickup soccer games in New York. Connect with fellow players, 
            improve your skills, and have fun on the field.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => window.location.href = '/games'}
            >
              Find Games Near You
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.location.href = '/groups'}
            >
              Create a Group
            </Button>
          </div>
        </div>

        {/* Upcoming Games Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Upcoming Games
            </h2>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/games'}
            >
              View All Games
            </Button>
          </div>
          
          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sample game cards - will be replaced with real data */}
            <GameCard 
              gameName="Central Park Pickup"
              date="2024-01-25"
              time="18:00"
              price={15}
              location="Central Park, NYC"
              attendees={8}
              maxAttendees={12}
              groupName="NYC Women&apos;s Soccer"
            />
            <GameCard 
              gameName="Brooklyn Bridge Park"
              date="2024-01-26"
              time="19:00"
              price={12}
              location="Brooklyn Bridge Park"
              attendees={5}
              maxAttendees={10}
              groupName="Brooklyn Ballers"
            />
            <GameCard 
              gameName="Riverside Park Evening"
              date="2024-01-27"
              time="17:30"
              price={18}
              location="Riverside Park"
              attendees={10}
              maxAttendees={14}
              groupName="Manhattan United"
            />
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Games</h3>
              <p className="text-gray-600">
                Browse upcoming soccer games in your area. See details like 
                location, time, price, and who&apos;s attending.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Book & Pay</h3>
              <p className="text-gray-600">
                Secure your spot with a quick payment. No account required - 
                just enter your details and pay with your card.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚽</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Play & Connect</h3>
              <p className="text-gray-600">
                Show up and play! Meet new people, improve your skills, 
                and join the community WhatsApp group.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
