'use client'

import { fetchMeeting } from '@/services/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Video, Users, Calendar } from 'lucide-react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const createMeeting = async () => {
    try {
      setIsLoading(true);
      const result = await fetchMeeting();
      router.push(`/create/${result.meetingId}`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900">
            Virtual Meetings Made Simple
          </h1>
          <p className="text-lg text-slate-600">
            Create and join meetings with just one click. No downloads required.
          </p>
        </div>

        {/* Main Action Card */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle>Start a New Meeting</CardTitle>
            <CardDescription>
              Create a secure meeting room instantly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={createMeeting}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating meeting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Video className="w-5 h-5" />
                  <span>Create Meeting</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <Video className="w-12 h-12 text-blue-600" />
                <h3 className="font-semibold">HD Video</h3>
                <p className="text-sm text-slate-600">
                  Crystal clear video and audio quality
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <Users className="w-12 h-12 text-blue-600" />
                <h3 className="font-semibold">Group Meetings</h3>
                <p className="text-sm text-slate-600">
                  Host meetings with multiple participants
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <Calendar className="w-12 h-12 text-blue-600" />
                <h3 className="font-semibold">Easy Scheduling</h3>
                <p className="text-sm text-slate-600">
                  Schedule meetings in advance
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}