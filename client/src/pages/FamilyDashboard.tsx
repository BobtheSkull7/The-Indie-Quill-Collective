import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, BookOpen, Pen, Play, Square, Heart, Star } from "lucide-react";

interface FamilyMember {
  id: number;
  firstName: string;
  lastName: string;
  familyRole: string;
  hoursActive: number;
  wordCount: number;
  courseProgress: number;
}

interface FamilyData {
  id: number;
  familyName: string;
  targetPactHours: number;
  totalPactMinutes: number;
  anthologyTitle: string | null;
  anthologyContent: string | null;
  anthologyWordCount: number;
  members: FamilyMember[];
  totalHoursActive: number;
  totalWordCount: number;
  avgCourseProgress: number;
}

interface PactSession {
  id: number;
  sessionTitle: string;
  sessionType: string;
  durationMinutes: number;
  wordsWritten: number;
  createdAt: string;
}

export default function FamilyDashboard() {
  const queryClient = useQueryClient();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    title: "",
    type: "writing",
    description: "",
  });

  const { data: familyData, isLoading } = useQuery<FamilyData>({
    queryKey: ["/api/family/dashboard"],
  });

  const { data: recentSessions } = useQuery<PactSession[]>({
    queryKey: ["/api/family/pact-sessions"],
  });

  const startSessionMutation = useMutation({
    mutationFn: async (data: { title: string; type: string; description: string }) => {
      const res = await fetch("/api/family/pact-sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to start session");
      return res.json();
    },
    onSuccess: () => {
      setIsSessionActive(true);
      setSessionStart(new Date());
      setShowNewSession(false);
      queryClient.invalidateQueries({ queryKey: ["/api/family/pact-sessions"] });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/family/pact-sessions/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordsWritten: 0 }),
      });
      if (!res.ok) throw new Error("Failed to end session");
      return res.json();
    },
    onSuccess: () => {
      setIsSessionActive(false);
      setSessionStart(null);
      setSessionTimer(0);
      queryClient.invalidateQueries({ queryKey: ["/api/family/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/family/pact-sessions"] });
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && sessionStart) {
      interval = setInterval(() => {
        setSessionTimer(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionStart]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const pactProgress = familyData 
    ? Math.min(100, (familyData.totalPactMinutes / 60 / familyData.targetPactHours) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Loading family dashboard...</div>
      </div>
    );
  }

  if (!familyData) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-playfair text-2xl text-slate-800">Family Dashboard</CardTitle>
              <CardDescription>
                You are not currently assigned to a family unit. Please contact your program coordinator.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Heart className="w-8 h-8 text-teal-600" />
              {familyData.familyName}
            </h1>
            <p className="text-slate-600 mt-1">One Family, One Legacy, One Pen</p>
          </div>
          
          {isSessionActive ? (
            <div className="flex items-center gap-4">
              <div className="bg-teal-100 text-teal-800 px-4 py-2 rounded-lg font-mono text-xl">
                {formatTime(sessionTimer)}
              </div>
              <Button 
                variant="destructive" 
                onClick={() => endSessionMutation.mutate()}
                disabled={endSessionMutation.isPending}
              >
                <Square className="w-4 h-4 mr-2" />
                End PACT Session
              </Button>
            </div>
          ) : (
            <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Play className="w-4 h-4 mr-2" />
                  Start PACT Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-playfair">Start a PACT Session</DialogTitle>
                  <DialogDescription>
                    Track your Parent and Child Together time for DGLF reporting.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title">Session Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Story Writing Time"
                      value={sessionForm.title}
                      onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Activity Type</Label>
                    <Select
                      value={sessionForm.type}
                      onValueChange={(value) => setSessionForm({ ...sessionForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="writing">Writing Together</SelectItem>
                        <SelectItem value="reading">Reading Aloud</SelectItem>
                        <SelectItem value="discussion">Story Discussion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">What are you working on?</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your family activity..."
                      value={sessionForm.description}
                      onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    onClick={() => startSessionMutation.mutate(sessionForm)}
                    disabled={!sessionForm.title || startSessionMutation.isPending}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Begin Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-teal-800 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Family Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-900">{familyData.members.length}</div>
              <p className="text-sm text-teal-700 mt-1">household participants</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                PACT Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">
                {Math.floor(familyData.totalPactMinutes / 60)}h {familyData.totalPactMinutes % 60}m
              </div>
              <Progress value={pactProgress} className="mt-2 h-2" />
              <p className="text-sm text-blue-700 mt-1">of {familyData.targetPactHours}h target</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
                <Pen className="w-4 h-4" />
                Family Word Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">
                {familyData.totalWordCount.toLocaleString()}
              </div>
              <p className="text-sm text-purple-700 mt-1">words written together</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Course Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">
                {Math.round(familyData.avgCourseProgress)}%
              </div>
              <p className="text-sm text-amber-700 mt-1">family average</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-playfair text-xl text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Family Members
              </CardTitle>
              <CardDescription>Individual progress for each household member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {familyData.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-semibold">
                        {member.firstName?.[0] || "?"}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">
                          {member.firstName} {member.lastName}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {member.familyRole || "Member"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-slate-600">{member.wordCount.toLocaleString()} words</div>
                      <div className="text-teal-600">{member.courseProgress}% complete</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-playfair text-xl text-slate-800 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Family Anthology
              </CardTitle>
              <CardDescription>Your shared "Legacy Work" - co-authored by the whole family</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <div className="text-lg font-semibold text-amber-900">
                    {familyData.anthologyTitle || "Untitled Family Story"}
                  </div>
                  <div className="text-sm text-amber-700 mt-1">
                    {familyData.anthologyWordCount.toLocaleString()} words
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Pen className="w-4 h-4 mr-2" />
                  Continue Writing Together
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-playfair text-xl text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent PACT Sessions
            </CardTitle>
            <CardDescription>Parent and Child Together time logged for DGLF compliance</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">{session.sessionTitle}</div>
                      <div className="text-sm text-slate-600">
                        {new Date(session.createdAt).toLocaleDateString()} - {session.sessionType}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-teal-600">{session.durationMinutes} min</div>
                      {session.wordsWritten > 0 && (
                        <div className="text-sm text-slate-600">{session.wordsWritten} words</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No PACT sessions logged yet.</p>
                <p className="text-sm">Start a session to track your family time together!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
