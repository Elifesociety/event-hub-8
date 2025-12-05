import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CalendarDays, 
  Plus, 
  MapPin, 
  Clock,
  Edit,
  Trash2,
  ExternalLink
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Program = Tables<"programs">;

const venues = [
  { id: "main", name: "Main Stage" },
  { id: "halla", name: "Hall A" },
  { id: "hallb", name: "Hall B" },
  { id: "food", name: "Food Court" },
  { id: "amphi", name: "Amphitheater" },
];

// Google Maps embed URL - replace with your actual venue location
const GOOGLE_MAPS_EMBED_URL = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.2649912453065!2d73.85674327519619!3d18.520430782572647!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2c07f4b4b7e33%3A0x8b7c03f4f4b4b7e3!2sPune%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1699999999999!5m2!1sen!2sin";

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [mapUrl, setMapUrl] = useState(GOOGLE_MAPS_EMBED_URL);
  const [showMapInput, setShowMapInput] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: "",
    date: "",
    start_time: "",
    end_time: "",
    venue: "",
    description: "",
    location_details: ""
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .order("date", { ascending: true });
    
    if (error) {
      toast.error("Failed to fetch programs");
      console.error(error);
    } else {
      setPrograms(data || []);
    }
    setLoading(false);
  };

  const handleAddProgram = async () => {
    if (!newProgram.name || !newProgram.date || !newProgram.start_time || !newProgram.venue) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    const programData: TablesInsert<"programs"> = {
      name: newProgram.name,
      date: newProgram.date,
      start_time: newProgram.start_time,
      end_time: newProgram.end_time || newProgram.start_time,
      venue: newProgram.venue,
      description: newProgram.description || null,
      location_details: newProgram.location_details || null
    };

    const { error } = await supabase
      .from("programs")
      .insert(programData);
    
    if (error) {
      toast.error("Failed to add program");
      console.error(error);
    } else {
      toast.success("Program added successfully");
      setNewProgram({ name: "", date: "", start_time: "", end_time: "", venue: "", description: "", location_details: "" });
      setShowForm(false);
      fetchPrograms();
    }
    setSaving(false);
  };

  const handleDeleteProgram = async (id: string) => {
    const { error } = await supabase
      .from("programs")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Failed to delete program");
      console.error(error);
    } else {
      toast.success("Program deleted");
      setPrograms(programs.filter(p => p.id !== id));
    }
  };

  const handleMapUrlUpdate = () => {
    setShowMapInput(false);
    toast.success("Map URL updated");
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Program Scheduling</h1>
            <p className="text-muted-foreground mt-1">Manage event programs and venue locations</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant="accent">
            <Plus className="h-4 w-4 mr-2" />
            Add Program
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 animate-slide-up">
            <CardHeader>
              <CardTitle>New Program</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Program Name</Label>
                  <Input
                    id="name"
                    value={newProgram.name}
                    onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                    placeholder="Enter program name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <select
                    id="venue"
                    value={newProgram.venue}
                    onChange={(e) => setNewProgram({ ...newProgram, venue: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select venue</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newProgram.date}
                    onChange={(e) => setNewProgram({ ...newProgram, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={newProgram.start_time}
                      onChange={(e) => setNewProgram({ ...newProgram, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={newProgram.end_time}
                      onChange={(e) => setNewProgram({ ...newProgram, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                    placeholder="Enter program description"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button onClick={handleAddProgram} disabled={saving}>
                    {saving ? "Saving..." : "Save Program"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Programs List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Scheduled Programs</h2>
            {loading ? (
              <Card className="p-8 text-center text-muted-foreground">
                <p>Loading programs...</p>
              </Card>
            ) : programs.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <p>No programs scheduled yet. Click "Add Program" to get started.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {programs.map((program) => (
                  <Card key={program.id} className="animate-fade-in">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            <CalendarDays className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{program.name}</h3>
                            <p className="text-sm text-muted-foreground">{program.description}</p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {program.date} | {program.start_time} - {program.end_time}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {program.venue}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteProgram(program.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Venue Map - Google Maps Embed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Venue Map</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowMapInput(!showMapInput)}
              >
                <Edit className="h-3 w-3 mr-2" />
                Update Map
              </Button>
            </div>

            {showMapInput && (
              <Card className="mb-4 p-4">
                <div className="space-y-3">
                  <Label htmlFor="mapUrl">Google Maps Embed URL</Label>
                  <div className="text-xs text-muted-foreground mb-2">
                    1. Go to <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Maps</a>
                    <br />2. Search your venue location
                    <br />3. Click Share → Embed a map → Copy HTML
                    <br />4. Paste the src URL from the iframe below
                  </div>
                  <Input
                    id="mapUrl"
                    value={mapUrl}
                    onChange={(e) => setMapUrl(e.target.value)}
                    placeholder="Paste Google Maps embed URL here"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleMapUrlUpdate}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowMapInput(false)}>Cancel</Button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative bg-muted h-96">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Venue Location Map"
                  />
                </div>
                <div className="p-3 bg-muted/50 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Event Venue Location</span>
                  <a 
                    href="https://maps.google.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    Open in Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}