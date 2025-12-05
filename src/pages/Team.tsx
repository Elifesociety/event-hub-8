import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Shield,
  UserCheck,
  Phone,
  Briefcase,
  Calendar,
  Trash2,
  Loader2,
  Theater,
  Store
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type TeamMember = Tables<"team_members">;
type TeamRole = "administration" | "volunteer" | "stage_crew" | "stall_crew";

const roleConfig = {
  administration: {
    label: "Administration",
    icon: Shield,
    color: "bg-primary/10 text-primary",
    responsibilities: ["Event Director", "Finance Manager", "Operations Head", "Marketing Lead", "Logistics Coordinator"]
  },
  volunteer: {
    label: "Volunteer", 
    icon: UserCheck,
    color: "bg-info/10 text-info",
    responsibilities: ["Registration Desk", "Information Booth", "General Support", "Crowd Management"]
  },
  stage_crew: {
    label: "Stage Crew",
    icon: Theater,
    color: "bg-warning/10 text-warning",
    responsibilities: ["Sound Engineer", "Light Technician", "Stage Manager", "Backstage Coordinator", "MC/Anchor"]
  },
  stall_crew: {
    label: "Stall Crew",
    icon: Store,
    color: "bg-success/10 text-success",
    responsibilities: ["Food Court Assistant", "Stall Coordinator", "Sales Support", "Inventory Manager"]
  }
};

const shifts = ["Morning (8AM-2PM)", "Afternoon (12PM-6PM)", "Evening (2PM-8PM)", "Night (6PM-10PM)"];

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formRole, setFormRole] = useState<TeamRole>("administration");
  const [newMember, setNewMember] = useState({
    name: "",
    mobile: "",
    shift_details: ""
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to fetch team members");
      console.error(error);
    } else {
      setTeam(data || []);
    }
    setLoading(false);
  };

  const handleAddMember = async () => {
    if (!newMember.name) {
      toast.error("Please fill in name");
      return;
    }

    setSaving(true);
    const memberData: TablesInsert<"team_members"> = {
      name: newMember.name,
      mobile: newMember.mobile || null,
      shift_details: newMember.shift_details || null,
      role: formRole
    };

    const { error } = await supabase
      .from("team_members")
      .insert(memberData);
    
    if (error) {
      toast.error("Failed to add team member");
      console.error(error);
    } else {
      toast.success("Team member added successfully");
      setNewMember({ name: "", mobile: "", shift_details: "" });
      setShowForm(false);
      fetchTeamMembers();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Failed to delete team member");
      console.error(error);
    } else {
      toast.success("Team member deleted");
      setTeam(team.filter(m => m.id !== id));
    }
  };

  const getTeamByRole = (role: TeamRole) => team.filter(m => m.role === role);

  if (loading) {
    return (
      <PageLayout>
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-1">Manage team members across all roles</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant="accent">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 animate-slide-up">
            <CardHeader>
              <CardTitle>Add Team Member</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label className="mb-2 block">Select Role</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(roleConfig) as TeamRole[]).map((role) => {
                    const config = roleConfig[role];
                    const Icon = config.icon;
                    return (
                      <Button 
                        key={role}
                        variant={formRole === role ? "default" : "outline"}
                        onClick={() => {
                          setFormRole(role);
                        }}
                        size="sm"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newMember.mobile}
                    onChange={(e) => setNewMember({ ...newMember, mobile: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift">Shift</Label>
                  <select
                    id="shift"
                    value={newMember.shift_details}
                    onChange={(e) => setNewMember({ ...newMember, shift_details: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select shift</option>
                    {shifts.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button onClick={handleAddMember} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Member
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="administration" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            {(Object.keys(roleConfig) as TeamRole[]).map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              const count = getTeamByRole(role).length;
              return (
                <TabsTrigger key={role} value={role} className="flex items-center gap-1 text-xs sm:text-sm">
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <span className="sm:hidden">{config.label.split(' ')[0]}</span>
                  <span className="ml-1">({count})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(roleConfig) as TeamRole[]).map((role) => {
            const config = roleConfig[role];
            const Icon = config.icon;
            const members = getTeamByRole(role);
            
            return (
              <TabsContent key={role} value={role}>
                {members.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <p>No {config.label.toLowerCase()} members added yet. Click "Add Member" to get started.</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((member) => (
                      <Card key={member.id} className="animate-fade-in">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${config.color}`}>
                                <Icon className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{member.name}</h3>
                                <Badge variant="secondary">{member.responsibilities}</Badge>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                            {member.shift_details && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {member.shift_details}
                              </div>
                            )}
                            {member.mobile && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                {member.mobile}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </PageLayout>
  );
}